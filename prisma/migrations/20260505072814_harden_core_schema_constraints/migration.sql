/*
  Warnings:

  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `balance` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - A unique constraint covering the columns `[userId,id]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,id]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_walletId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "isDefault" SET DEFAULT false,
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(14,2);

-- CreateIndex
CREATE UNIQUE INDEX "uq_category_user_id_id" ON "Category"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_wallet_user_id_name" ON "Wallet"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_wallet_user_id_id" ON "Wallet"("userId", "id");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_walletId_fkey" FOREIGN KEY ("userId", "walletId") REFERENCES "Wallet"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_categoryId_fkey" FOREIGN KEY ("userId", "categoryId") REFERENCES "Category"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Category_userId_name_key" RENAME TO "uq_category_user_id_name";
