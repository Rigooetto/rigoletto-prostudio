-- CreateEnum
CREATE TYPE "CompensationPeriodStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateTable
CREATE TABLE "production_tiers" (
    "id" TEXT NOT NULL,
    "songs_from" INTEGER NOT NULL,
    "songs_to" INTEGER,
    "amount_per_song" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_bonus_tiers" (
    "id" TEXT NOT NULL,
    "revenue_from" DECIMAL(12,2) NOT NULL,
    "revenue_to" DECIMAL(12,2),
    "bonus_amount" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_bonus_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_periods" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "CompensationPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "base_pay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "production_variable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mix_master_variable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "time_based_variable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "acquisition_commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "revenue_bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adjustment_notes" TEXT,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monthly_revenue_snapshot" DECIMAL(12,2),
    "delivered_songs_snapshot" INTEGER,
    "mix_master_count_snapshot" INTEGER,
    "approved_by_employee_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensation_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compensation_periods_employee_id_period_start_key" ON "compensation_periods"("employee_id", "period_start");

-- AddForeignKey
ALTER TABLE "compensation_periods" ADD CONSTRAINT "compensation_periods_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_periods" ADD CONSTRAINT "compensation_periods_approved_by_employee_id_fkey" FOREIGN KEY ("approved_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
