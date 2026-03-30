-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "billing_reminder_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "billing_reminder_day_of_month" INTEGER;
ALTER TABLE "Tenant" ADD COLUMN "billing_reminder_hour" INTEGER;
ALTER TABLE "Tenant" ADD COLUMN "billing_reminder_subject" VARCHAR(300);
ALTER TABLE "Tenant" ADD COLUMN "billing_reminder_body" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "billing_payment_alias" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "last_billing_reminder_sent_at" TIMESTAMP(3);
