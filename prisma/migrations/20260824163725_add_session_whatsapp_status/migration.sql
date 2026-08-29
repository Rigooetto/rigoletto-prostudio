-- CreateEnum
CREATE TYPE "WhatsappMessageStatus" AS ENUM ('NOT_SENT', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "whatsapp_error" TEXT,
ADD COLUMN     "whatsapp_sent_at" TIMESTAMP(3),
ADD COLUMN     "whatsapp_status" "WhatsappMessageStatus" NOT NULL DEFAULT 'NOT_SENT';
