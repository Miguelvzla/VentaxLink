-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "points_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "points_ars_per_point" DECIMAL(12,2),
ADD COLUMN     "points_redeem_min_balance" INTEGER,
ADD COLUMN     "points_redeem_percent" DECIMAL(5,2),
ADD COLUMN     "points_redeem_cost" INTEGER;
