import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponType, PlanType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPlan(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    if (!t) throw new NotFoundException('Comercio no encontrado');
    if (t.plan === PlanType.STARTER) {
      throw new ForbiddenException(
        'Los cupones están disponibles en planes Pro y Mayorista',
      );
    }
  }

  async list(tenantId: string) {
    await this.assertPlan(tenantId);
    const rows = await this.prisma.coupon.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
    return {
      data: rows.map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description,
        percent: Number(c.value),
        is_active: c.is_active,
        starts_at: c.starts_at?.toISOString() ?? null,
        expires_at: c.expires_at?.toISOString() ?? null,
        max_uses: c.max_uses,
        uses_count: c.uses_count,
        created_at: c.created_at.toISOString(),
      })),
    };
  }

  async create(tenantId: string, dto: CreateCouponDto) {
    await this.assertPlan(tenantId);
    const code = dto.code.trim().toUpperCase();
    const starts = dto.starts_at ? new Date(dto.starts_at) : null;
    const expires = dto.expires_at ? new Date(dto.expires_at) : null;
    try {
      const c = await this.prisma.coupon.create({
        data: {
          tenant_id: tenantId,
          code,
          description: dto.description?.trim() || null,
          type: CouponType.PERCENTAGE,
          value: new Prisma.Decimal(dto.percent),
          is_active: dto.is_active ?? true,
          starts_at: starts,
          expires_at: expires,
          max_uses: dto.max_uses ?? null,
        },
      });
      return {
        data: {
          id: c.id,
          code: c.code,
          percent: dto.percent,
        },
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe un cupón con ese código');
      }
      throw e;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateCouponDto) {
    await this.assertPlan(tenantId);
    const existing = await this.prisma.coupon.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) throw new NotFoundException('Cupón no encontrado');

    const data: Prisma.CouponUpdateInput = {};
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.percent !== undefined) data.value = new Prisma.Decimal(dto.percent);
    if (dto.starts_at !== undefined) {
      data.starts_at = dto.starts_at ? new Date(dto.starts_at) : null;
    }
    if (dto.expires_at !== undefined) {
      data.expires_at = dto.expires_at ? new Date(dto.expires_at) : null;
    }
    if (dto.max_uses !== undefined) data.max_uses = dto.max_uses;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    const c = await this.prisma.coupon.update({
      where: { id },
      data,
    });
    return {
      data: {
        id: c.id,
        code: c.code,
        percent: Number(c.value),
        is_active: c.is_active,
      },
    };
  }

  async remove(tenantId: string, id: string) {
    await this.assertPlan(tenantId);
    const existing = await this.prisma.coupon.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) throw new NotFoundException('Cupón no encontrado');
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }
}
