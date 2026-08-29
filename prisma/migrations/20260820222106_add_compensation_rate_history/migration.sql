-- AlterTable
ALTER TABLE "production_tiers" ADD COLUMN     "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "effective_to" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "revenue_bonus_tiers" ADD COLUMN     "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "effective_to" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "service_compensation_rates" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "compensation_value" DECIMAL(12,2) NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_compensation_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_pay_rates" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "base_pay_weekly" DECIMAL(12,2),
    "acquisition_commission_percent" DECIMAL(5,2),
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pay_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_compensation_rates_service_id_effective_from_idx" ON "service_compensation_rates"("service_id", "effective_from");

-- CreateIndex
CREATE INDEX "employee_pay_rates_employee_id_effective_from_idx" ON "employee_pay_rates"("employee_id", "effective_from");

-- CreateIndex
CREATE INDEX "production_tiers_songs_from_effective_from_idx" ON "production_tiers"("songs_from", "effective_from");

-- CreateIndex
CREATE INDEX "revenue_bonus_tiers_revenue_from_effective_from_idx" ON "revenue_bonus_tiers"("revenue_from", "effective_from");

-- AddForeignKey
ALTER TABLE "service_compensation_rates" ADD CONSTRAINT "service_compensation_rates_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_pay_rates" ADD CONSTRAINT "employee_pay_rates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
