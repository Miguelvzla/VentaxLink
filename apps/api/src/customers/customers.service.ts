import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const rows = await this.prisma.customer.findMany({
      where: { tenant_id: tenantId },
      orderBy: { updated_at: 'desc' },
      take: 500,
    });
    return {
      data: rows.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        points: c.points,
        total_orders: c.total_orders,
        total_spent: c.total_spent.toString(),
        last_order_at: c.last_order_at,
        is_active: c.is_active,
        created_at: c.created_at,
      })),
    };
  }
}
