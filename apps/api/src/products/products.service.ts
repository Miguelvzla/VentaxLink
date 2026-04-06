import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanType, Prisma } from '@prisma/client';
import {
  maxActiveProductsForPlan,
  maxImagesPerProductForPlan,
} from '../common/plan-limits';
import { PrismaService } from '../prisma/prisma.service';
import { rewriteStoredUploadsUrl } from '../uploads/public-asset-url';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

function slugify(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'producto';
}

function toDecimal(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

const productAdminSelect = {
  id: true,
  slug: true,
  name: true,
  short_desc: true,
  description: true,
  price: true,
  compare_price: true,
  stock: true,
  sort_order: true,
  is_active: true,
  is_featured: true,
  is_new: true,
  tags: true,
  created_at: true,
  updated_at: true,
  images: {
    orderBy: [{ is_primary: 'desc' as const }, { sort_order: 'asc' as const }],
    take: 3,
    select: { url: true },
  },
} satisfies Prisma.ProductSelect;

type ProductAdminRow = Prisma.ProductGetPayload<{
  select: typeof productAdminSelect;
}>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeProduct(p: {
    id: string;
    slug: string;
    name: string;
    short_desc: string | null;
    description: string | null;
    price: Prisma.Decimal;
    compare_price: Prisma.Decimal | null;
    stock: number;
    sort_order: number;
    is_active: boolean;
    is_featured: boolean;
    is_new: boolean;
    tags: string[];
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      ...p,
      price: p.price.toString(),
      compare_price: p.compare_price?.toString() ?? null,
    };
  }

  private serializeAdminProduct(p: ProductAdminRow) {
    const { images, ...rest } = p;
    const urls = images
      .map((i) => rewriteStoredUploadsUrl(i.url) ?? i.url)
      .filter(Boolean);
    return {
      ...this.serializeProduct(rest),
      primary_image_url: urls[0] ?? null,
      image_urls: urls,
    };
  }

  private assertAllowedProductImageUrls(urls: string[]) {
    for (const u of urls) {
      const t = u.trim();
      if (!t) continue;
      if (!/^https?:\/\//i.test(t) && !/^\/v1\/uploads\//i.test(t)) {
        throw new BadRequestException(
          'Cada imagen tiene que ser un link http(s) o una ruta /v1/uploads/…',
        );
      }
    }
  }

  private normalizeProductImageUrls(
    dto: { image_url?: string; image_urls?: string[] },
    max: number,
  ): string[] {
    let urls: string[] = [];
    if (dto.image_urls?.length) {
      urls = dto.image_urls
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter(Boolean);
    } else if (dto.image_url?.trim()) {
      urls = [dto.image_url.trim()];
    }
    const out = urls.slice(0, max);
    this.assertAllowedProductImageUrls(out);
    return out;
  }

  private async loadAdminProduct(
    tenantId: string,
    id: string,
  ): Promise<ProductAdminRow | null> {
    return this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId },
      select: productAdminSelect,
    });
  }

  async list(tenantId: string) {
    const rows = await this.prisma.product.findMany({
      where: { tenant_id: tenantId },
      orderBy: [
        { is_featured: 'desc' },
        { sort_order: 'asc' },
        { created_at: 'desc' },
      ],
      select: productAdminSelect,
    });
    return { data: rows.map((r) => this.serializeAdminProduct(r)) };
  }

  async create(tenantId: string, dto: CreateProductDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    const plan = tenant?.plan ?? PlanType.STARTER;
    const maxProducts = maxActiveProductsForPlan(plan);
    const willBeActive = dto.is_active ?? true;
    if (willBeActive) {
      const activeCount = await this.prisma.product.count({
        where: { tenant_id: tenantId, is_active: true },
      });
      if (activeCount >= maxProducts) {
        throw new BadRequestException(
          `Límite del plan: hasta ${maxProducts} productos activos en catálogo.`,
        );
      }
    }

    const maxImg = maxImagesPerProductForPlan(plan);
    const imageUrls = this.normalizeProductImageUrls(dto, maxImg);

    let base = dto.slug?.trim() || slugify(dto.name);
    let slug = base;
    let n = 2;
    for (;;) {
      const clash = await this.prisma.product.findUnique({
        where: { tenant_id_slug: { tenant_id: tenantId, slug } },
      });
      if (!clash) break;
      slug = `${base}-${n++}`;
    }

    try {
      const newId = await this.prisma.$transaction(async (tx) => {
        let sortOrder = dto.sort_order ?? null;
        if (sortOrder == null) {
          const agg = await tx.product.aggregate({
            where: { tenant_id: tenantId },
            _max: { sort_order: true },
          });
          sortOrder = (agg._max.sort_order ?? 0) + 1;
        }
        const created = await tx.product.create({
          data: {
            tenant_id: tenantId,
            slug,
            name: dto.name,
            short_desc: dto.short_desc ?? null,
            description: dto.description ?? null,
            price: toDecimal(dto.price),
            compare_price:
              dto.compare_price != null ? toDecimal(dto.compare_price) : null,
            stock: dto.stock ?? 0,
            sort_order: sortOrder,
            is_active: dto.is_active ?? true,
            is_featured: dto.is_featured ?? false,
            is_new: dto.is_new ?? false,
            tags: dto.tags ?? [],
          },
          select: { id: true },
        });
        let sort = 0;
        for (const url of imageUrls) {
          await tx.productImage.create({
            data: {
              product_id: created.id,
              url,
              is_primary: sort === 0,
              sort_order: sort++,
            },
          });
        }
        return created.id;
      });

      const full = await this.loadAdminProduct(tenantId, newId);
      if (!full) throw new NotFoundException('Producto no encontrado');
      return { data: this.serializeAdminProduct(full) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe un producto con ese slug');
      }
      throw e;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }

    const hasImageUpdate =
      dto.image_url !== undefined || dto.image_urls !== undefined;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    const plan = tenant?.plan ?? PlanType.STARTER;

    if (dto.is_active === true && !existing.is_active) {
      const maxProducts = maxActiveProductsForPlan(plan);
      const activeCount = await this.prisma.product.count({
        where: { tenant_id: tenantId, is_active: true },
      });
      if (activeCount >= maxProducts) {
        throw new BadRequestException(
          `Límite del plan: hasta ${maxProducts} productos activos en catálogo.`,
        );
      }
    }

    let slug = dto.slug;
    if (slug != null && slug !== existing.slug) {
      const clash = await this.prisma.product.findUnique({
        where: { tenant_id_slug: { tenant_id: tenantId, slug } },
      });
      if (clash) {
        throw new ConflictException('Ya existe un producto con ese slug');
      }
    }

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name != null) data.name = dto.name;
    if (slug != null) data.slug = slug;
    if (dto.short_desc !== undefined) data.short_desc = dto.short_desc ?? null;
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.price != null) data.price = toDecimal(dto.price);
    if (dto.compare_price !== undefined) {
      data.compare_price =
        dto.compare_price != null ? toDecimal(dto.compare_price) : null;
    }
    if (dto.stock != null) data.stock = dto.stock;
    if (dto.is_active != null) data.is_active = dto.is_active;
    if (dto.is_featured != null) data.is_featured = dto.is_featured;
    if (dto.is_new != null) data.is_new = dto.is_new;
    if (dto.tags != null) data.tags = dto.tags;
    if (dto.sort_order != null) data.sort_order = dto.sort_order;

    const hasFieldUpdates = Object.keys(data).length > 0;

    if (!hasFieldUpdates && !hasImageUpdate) {
      const p = await this.loadAdminProduct(tenantId, id);
      if (!p) throw new NotFoundException('Producto no encontrado');
      return { data: this.serializeAdminProduct(p) };
    }

    if (hasFieldUpdates) {
      await this.prisma.product.update({
        where: { id },
        data,
      });
    }

    if (hasImageUpdate) {
      const maxImg = maxImagesPerProductForPlan(plan);
      const urls =
        dto.image_urls !== undefined
          ? (dto.image_urls ?? []).slice(0, maxImg)
          : dto.image_url !== undefined
            ? dto.image_url?.trim()
              ? [dto.image_url.trim()]
              : []
            : [];
      this.assertAllowedProductImageUrls(urls);
      await this.prisma.productImage.deleteMany({ where: { product_id: id } });
      let sort = 0;
      for (const url of urls) {
        if (!url?.trim()) continue;
        await this.prisma.productImage.create({
          data: {
            product_id: id,
            url: url.trim(),
            is_primary: sort === 0,
            sort_order: sort++,
          },
        });
      }
    }

    const full = await this.loadAdminProduct(tenantId, id);
    if (!full) throw new NotFoundException('Producto no encontrado');
    return { data: this.serializeAdminProduct(full) };
  }

  /** Baja lógica: no se muestra en la tienda pública. */
  async softDelete(tenantId: string, id: string) {
    const existing = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }
    await this.prisma.product.update({
      where: { id },
      data: { is_active: false },
    });
    return { ok: true };
  }
}
