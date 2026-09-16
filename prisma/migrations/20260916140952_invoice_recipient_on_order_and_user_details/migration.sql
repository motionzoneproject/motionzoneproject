-- AlterTable
ALTER TABLE "order" ADD COLUMN     "invoiceEmail" TEXT,
ADD COLUMN     "invoiceName" TEXT,
ADD COLUMN     "invoicePhone" TEXT;

-- AlterTable
ALTER TABLE "user_details" ADD COLUMN     "invoiceEmail" TEXT,
ADD COLUMN     "invoiceName" TEXT,
ADD COLUMN     "invoicePhone" TEXT;
