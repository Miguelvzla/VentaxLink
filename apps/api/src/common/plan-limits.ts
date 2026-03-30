import { PlanType } from '@prisma/client';

export function maxActiveProductsForPlan(plan: PlanType): number {
  switch (plan) {
    case PlanType.STARTER:
      return 20;
    case PlanType.PRO:
      return 100;
    case PlanType.WHOLESALE:
      return 50_000;
    default:
      return 20;
  }
}

export function maxImagesPerProductForPlan(plan: PlanType): number {
  switch (plan) {
    case PlanType.STARTER:
      return 1;
    case PlanType.PRO:
    case PlanType.WHOLESALE:
      return 3;
    default:
      return 1;
  }
}

export function analyticsRangeDaysForPlan(plan: PlanType): number {
  switch (plan) {
    case PlanType.STARTER:
      return 30;
    case PlanType.PRO:
      return 90;
    case PlanType.WHOLESALE:
      return 365;
    default:
      return 30;
  }
}

/** Vistas de detalle de producto (ranking + eventos) solo en Pro y Mayorista. */
export function productDetailViewsAnalyticsForPlan(plan: PlanType): boolean {
  return plan === PlanType.PRO || plan === PlanType.WHOLESALE;
}
