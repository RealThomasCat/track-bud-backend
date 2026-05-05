-- CreateIndex
CREATE INDEX "idx_categories_user_archived" ON "Category"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "idx_transactions_user_occurred_at" ON "Transaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "idx_transactions_user_kind_occurred_at" ON "Transaction"("userId", "kind", "occurredAt");

-- CreateIndex
CREATE INDEX "idx_transactions_user_category_occurred_at" ON "Transaction"("userId", "categoryId", "occurredAt");
