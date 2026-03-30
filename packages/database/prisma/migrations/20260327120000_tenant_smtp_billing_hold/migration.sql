-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "smtp_host" VARCHAR(255),
ADD COLUMN     "smtp_port" INTEGER,
ADD COLUMN     "smtp_secure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtp_user" VARCHAR(255),
ADD COLUMN     "smtp_pass" TEXT,
ADD COLUMN     "smtp_from_email" VARCHAR(255),
ADD COLUMN     "smtp_from_name" VARCHAR(120),
ADD COLUMN     "notify_customer_order_email" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "billing_hold_message" TEXT;
