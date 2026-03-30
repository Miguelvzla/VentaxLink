-- AlterTable: evita doble renovación en el mismo mes calendario
ALTER TABLE "Tenant" ADD COLUMN "last_plan_expiry_rolled_at" TIMESTAMP(3);
