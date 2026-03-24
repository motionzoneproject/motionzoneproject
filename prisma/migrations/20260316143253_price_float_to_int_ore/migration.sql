/*
  Warnings:

  - You are about to alter the column `totalPrice` on the `order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `price` on the `order_item` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `price` on the `product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "order" ALTER COLUMN "totalPrice" SET DATA TYPE INTEGER USING ROUND("totalPrice" * 100)::INTEGER;

-- AlterTable
ALTER TABLE "order_item" ALTER COLUMN "price" SET DATA TYPE INTEGER USING ROUND("price" * 100)::INTEGER;

-- AlterTable
ALTER TABLE "product" ALTER COLUMN "price" SET DEFAULT 0,
ALTER COLUMN "price" SET DATA TYPE INTEGER USING ROUND("price" * 100)::INTEGER;
