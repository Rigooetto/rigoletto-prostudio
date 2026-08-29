-- CreateTable
CREATE TABLE "session_payments" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(12,2),
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recorded_by_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_payments_session_id_idx" ON "session_payments"("session_id");

-- CreateIndex
CREATE INDEX "session_payments_paid_at_idx" ON "session_payments"("paid_at");

-- AddForeignKey
ALTER TABLE "session_payments" ADD CONSTRAINT "session_payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_payments" ADD CONSTRAINT "session_payments_recorded_by_employee_id_fkey" FOREIGN KEY ("recorded_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
