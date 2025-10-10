/*
  Warnings:

  - You are about to drop the column `kind` on the `Category` table. All the data in the column will be lost.
  - Added the required column `kind` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('income', 'expense');

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "kind";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "kind" "TransactionKind" NOT NULL;

-- DropEnum
DROP TYPE "public"."CategoryKind";
