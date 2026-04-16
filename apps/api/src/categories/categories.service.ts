import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'seccion';
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const rows = await this.prisma.category.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        sort_order: true,
        _count: { select: { products: { where: { is_active: true } } } },
      },
    });
    return {
      data: rows.map((r) => ({
        ...r,
        product_count: r._count.products,
        _count: undefined,
      })),
    };
  }

  async create(tenantId: string, dto: CreateCategoryDto) {
    let base = slugify(dto.name);
    let slug = base;
    let n = 2;
    for (;;) {
      const clash = await this.prisma.category.findUnique({
        where: { tenant_id_slug: { tenant_id: tenantId, slug } },
      });
      if (!clash) break;
      slug = `${base}-${n++}`;
    }

    const maxSort = await this.prisma.category.aggregate({
      where: { tenant_id: tenantId },
      _max: { sort_order: true },
    });

    try {
      const cat = await this.prisma.category.create({
        data: {
          tenant_id: tenantId,
          name: dto.name,
          slug,
          description: dto.description ?? null,
          sort_order: dto.sort_order ?? (maxSort._max.sort_order ?? 0) + 1,
        },
        select: { id: true, name: true, slug: true, description: true, sort_order: true },
      });
      return { data: { ...cat, product_count: 0 } };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe una sección con ese nombre');
      }
      throw e;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) throw new NotFoundException('Sección no encontrada');

    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name != null) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.sort_order != null) data.sort_order = dto.sort_order;

    await this.prisma.category.update({ where: { id }, data });
    return this.list(tenantId);
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.category.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) throw new NotFoundException('Sección no encontrada');
    // Desasociar productos antes de eliminar la sección
    await this.prisma.product.updateMany({
      where: { tenant_id: tenantId, category_id: id },
      data: { category_id: null },
    });
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }
}
