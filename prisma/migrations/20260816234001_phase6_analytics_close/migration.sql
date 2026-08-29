-- CreateTable
CREATE TABLE "monthly_closes" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "closed_by_employee_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_closes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_closes_month_key" ON "monthly_closes"("month");

-- AddForeignKey
ALTER TABLE "monthly_closes" ADD CONSTRAINT "monthly_closes_closed_by_employee_id_fkey" FOREIGN KEY ("closed_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
