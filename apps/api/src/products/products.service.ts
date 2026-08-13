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
import {
  BulkPriceUpdateDto,
  PriceMarkupType,
  PriceRounding,
} from './dto/bulk-price-update.dto';
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

/**
 * Clave de comparación para la carga masiva de precios.
 * Ignora mayúsculas, acentos y espacios de más, pero NO puntuación: la planilla
 * modelo se baja con los nombres tal cual están en la tienda, así que conviene
 * ser conservador y no arriesgar falsos positivos.
 */
function normalizeProductName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Precio de venta a partir del costo del proveedor + margen. */
function computeSalePrice(
  cost: number,
  markupType: PriceMarkupType,
  markupValue: number,
  rounding: PriceRounding,
): number {
  const base =
    markupType === PriceMarkupType.PERCENT
      ? cost * (1 + markupValue / 100)
      : cost + markupValue;

  const exact = Math.round(base * 100) / 100;
  const step =
    rounding === PriceRounding.NEAREST_100
      ? 100
      : rounding === PriceRounding.NEAREST_1000
        ? 1000
        : 0;
  if (step === 0) return exact;

  const rounded = Math.round(exact / step) * step;
  /** Redondear no puede dejar en 0 un producto que sí tiene precio. */
  return rounded === 0 && exact > 0 ? exact : rounded;
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
  unit: true,
  category_id: true,
  category: { select: { id: true, name: true, slug: true } },
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
    unit?: string;
    category_id?: string | null;
    category?: { id: string; name: string; slug: string } | null;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      ...p,
      price: p.price.toString(),
      compare_price: p.compare_price?.toString() ?? null,
      unit: p.unit ?? 'unidad',
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

  /**
   * Coloca el producto en la posición 1-based dentro de su grupo (destacados / no destacados)
   * y reasigna sort_order 1..n al resto para evitar duplicados y cerrar huecos.
   */
  private async reorderProductToPosition(
    tenantId: string,
    productId: string,
    targetPosition1Based: number,
    finalFeatured: boolean,
  ): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, tenant_id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }
    const n = Math.floor(Number(targetPosition1Based));
    if (!Number.isFinite(n) || n < 1) {
      throw new BadRequestException(
        'La posición tiene que ser un número entero ≥ 1',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing.is_featured !== finalFeatured) {
        await tx.product.update({
          where: { id: productId },
          data: { is_featured: finalFeatured },
        });
      }

      const group = await tx.product.findMany({
        where: { tenant_id: tenantId, is_featured: finalFeatured },
        orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      const ids = group.map((g) => g.id);
      const without = ids.filter((i) => i !== productId);
      const insertAt = Math.min(Math.max(n - 1, 0), without.length);
      const newOrder = [
        ...without.slice(0, insertAt),
        productId,
        ...without.slice(insertAt),
      ];
      for (let i = 0; i < newOrder.length; i++) {
        await tx.product.update({
          where: { id: newOrder[i] },
          data: { sort_order: i + 1 },
        });
      }
    });
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
            unit: dto.unit ?? 'unidad',
            category_id: dto.category_id ?? null,
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

    const hasReorder = dto.sort_order != null;
    const finalFeatured =
      dto.is_featured !== undefined ? dto.is_featured : existing.is_featured;

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
    if (!hasReorder && dto.is_featured != null) data.is_featured = dto.is_featured;
    if (dto.is_new != null) data.is_new = dto.is_new;
    if (dto.tags != null) data.tags = dto.tags;
    if (dto.unit != null) data.unit = dto.unit;
    if (dto.category_id !== undefined) {
      data.category = dto.category_id
        ? { connect: { id: dto.category_id } }
        : { disconnect: true };
    }

    const hasFieldUpdates = Object.keys(data).length > 0;

    if (!hasFieldUpdates && !hasImageUpdate && !hasReorder) {
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

    if (hasReorder) {
      await this.reorderProductToPosition(
        tenantId,
        id,
        dto.sort_order!,
        finalFeatured,
      );
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

  /**
   * Actualización masiva de precios desde una planilla `nombre | precio`.
   *
   * El precio de la planilla es el **costo del proveedor**: se guarda en
   * `cost_price` y el precio de venta sale de aplicarle el margen.
   * Solo se tocan los productos cuyo nombre coincide; del resto se informa
   * únicamente cuántos quedaron afuera.
   *
   * Con `dry_run` (por defecto) no escribe nada: devuelve la vista previa
   * para que el comercio confirme antes de aplicar.
   */
  async bulkPriceUpdate(tenantId: string, dto: BulkPriceUpdateDto) {
    const dryRun = dto.dry_run !== false;
    const rounding = dto.rounding ?? PriceRounding.NEAREST_100;

    /** Última fila gana si el archivo repite un nombre. */
    const rowsByName = new Map<string, { name: string; cost: number }>();
    for (const row of dto.items) {
      const key = normalizeProductName(row.name);
      if (!key) continue;
      rowsByName.set(key, { name: row.name, cost: row.cost });
    }
    if (rowsByName.size === 0) {
      throw new BadRequestException(
        'El archivo no tiene filas válidas. Revisá que la columna de nombre no esté vacía.',
      );
    }

    const products = await this.prisma.product.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true, price: true },
    });

    /** Un mismo nombre normalizado puede repetirse: en ese caso no se toca. */
    const byName = new Map<string, { id: string; name: string; price: Prisma.Decimal }[]>();
    for (const p of products) {
      const key = normalizeProductName(p.name);
      if (!key) continue;
      const bucket = byName.get(key);
      if (bucket) bucket.push(p);
      else byName.set(key, [p]);
    }

    const matched: {
      product_id: string;
      name: string;
      current_price: number;
      cost: number;
      new_price: number;
    }[] = [];
    let unmatchedCount = 0;

    for (const [key, row] of rowsByName) {
      const hits = byName.get(key);
      if (!hits || hits.length !== 1) {
        unmatchedCount += 1;
        continue;
      }
      const product = hits[0];
      matched.push({
        product_id: product.id,
        name: product.name,
        current_price: Number(product.price),
        cost: row.cost,
        new_price: computeSalePrice(row.cost, dto.markup_type, dto.markup_value, rounding),
      });
    }

    if (!dryRun && matched.length > 0) {
      await this.prisma.$transaction(
        matched.map((m) =>
          this.prisma.product.update({
            where: { id: m.product_id },
            data: {
              price: toDecimal(m.new_price),
              cost_price: toDecimal(m.cost),
            },
          }),
        ),
      );
    }

    return {
      applied: !dryRun,
      matched_count: matched.length,
      unmatched_count: unmatchedCount,
      items: matched,
    };
  }
}
