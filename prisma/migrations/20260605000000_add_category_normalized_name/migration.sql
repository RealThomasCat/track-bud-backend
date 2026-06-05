ALTER TABLE "Category" ADD COLUMN "normalizedName" TEXT;

UPDATE "Category"
SET "normalizedName" = lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'));

WITH ranked_categories AS (
    SELECT
        "id",
        "userId",
        "normalizedName",
        first_value("id") OVER (
            PARTITION BY "userId", "normalizedName"
            ORDER BY "isDefault" DESC, "isArchived" ASC, "createdAt" ASC, "id" ASC
        ) AS "canonicalId"
    FROM "Category"
),
duplicate_categories AS (
    SELECT
        "id",
        "userId",
        "canonicalId"
    FROM ranked_categories
    WHERE "id" <> "canonicalId"
)
UPDATE "Transaction" AS t
SET "categoryId" = d."canonicalId"
FROM duplicate_categories AS d
WHERE t."userId" = d."userId"
  AND t."categoryId" = d."id";

WITH ranked_categories AS (
    SELECT
        "id",
        first_value("id") OVER (
            PARTITION BY "userId", "normalizedName"
            ORDER BY "isDefault" DESC, "isArchived" ASC, "createdAt" ASC, "id" ASC
        ) AS "canonicalId"
    FROM "Category"
)
DELETE FROM "Category" AS c
USING ranked_categories AS r
WHERE c."id" = r."id"
  AND r."id" <> r."canonicalId";

ALTER TABLE "Category" ALTER COLUMN "normalizedName" SET NOT NULL;

DROP INDEX "uq_category_user_id_name";

CREATE UNIQUE INDEX "uq_category_user_id_normalized_name" ON "Category"("userId", "normalizedName");
