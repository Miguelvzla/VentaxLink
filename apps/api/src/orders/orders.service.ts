import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PointType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const rows = await this.prisma.order.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 300,
      include: {
        items: {
          select: {
            id: true,
            product_name: true,
            quantity: true,
            unit_price: true,
            subtotal: true,
          },
        },
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
    });
    return {
      data: rows.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        payment_status: o.payment_status,
        delivery_type: o.delivery_type,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        customer_email: o.customer_email,
        subtotal: o.subtotal.toString(),
        total: o.total.toString(),
        shipping_cost: o.shipping_cost.toString(),
        discount_amount: o.discount_amount.toString(),
        customer_notes: o.customer_notes,
        admin_notes: o.admin_notes,
        created_at: o.created_at,
        customer: o.customer,
        items: o.items.map((i) => ({
          ...i,
          unit_price: i.unit_price.toString(),
          subtotal: i.subtotal.toString(),
        })),
      })),
    };
  }

  async updateStatus(tenantId: string, id: string, status: OrderStatus) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        tenant: {
          select: {
            points_enabled: true,
            points_ars_per_point: true,
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    const prevStatus = order.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status },
      });
      await tx.orderStatusHistory.create({
        data: {
          order_id: id,
          status,
          note: null,
        },
      });

      if (
        status === OrderStatus.DELIVERED &&
        prevStatus !== OrderStatus.DELIVERED &&
        order.customer_id &&
        order.tenant.points_enabled &&
        order.tenant.points_ars_per_point
      ) {
        const ars = Number(order.tenant.points_ars_per_point);
        if (ars > 0) {
          const dup = await tx.pointTransaction.findFirst({
            where: {
              order_id: id,
              type: PointType.EARNED,
            },
          });
          if (!dup) {
            const totalNum = Number(order.total);
            const pts = Math.floor(totalNum / ars);
            if (pts > 0) {
              await tx.customer.update({
                where: { id: order.customer_id },
                data: { points: { increment: pts } },
              });
              await tx.pointTransaction.create({
                data: {
                  customer_id: order.customer_id,
                  points: pts,
                  type: PointType.EARNED,
                  description: `Pedido #${order.order_number} entregado`,
                  order_id: id,
                },
              });
            }
          }
        }
      }
    });

    return { ok: true };
  }
}
