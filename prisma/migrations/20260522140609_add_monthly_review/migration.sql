-- CreateEnum
CREATE TYPE "MonthlyReviewStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "DataQualityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "MonthlyReview" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "MonthlyReviewStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "comparisonStart" TIMESTAMP(3),
    "comparisonEnd" TIMESTAMP(3),
    "title" TEXT,
    "dataQualityLevel" "DataQualityLevel",
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "errorMessage" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MonthlyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_monthly_review_user_status" ON "MonthlyReview"("userId", "status");

-- CreateIndex
CREATE INDEX "idx_monthly_review_user_period" ON "MonthlyReview"("userId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "uq_monthly_review_user_period" ON "MonthlyReview"("userId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "MonthlyReview" ADD CONSTRAINT "MonthlyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
