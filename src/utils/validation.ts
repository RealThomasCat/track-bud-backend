import { z } from "zod";

// Reusable positive integer id validator for route params and query params.
export const idSchema = z.coerce
    .number({
        message: "Id must be a number",
    })
    .int("Id must be an integer")
    .positive("Id must be positive");

// Reusable pagination limit validator.
// Keep this capped to protect the database and API from large requests.
export const paginationLimitSchema = z.coerce
    .number({
        message: "Limit must be a number",
    })
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot be greater than 50")
    .default(20);

// Allows only money values with up to 2 decimal places.
// This matches Decimal(14, 2) in Prisma/PostgreSQL.
export const moneySchema = z.coerce
    .number({
        message: "Amount must be a number",
    })
    .positive("Amount must be greater than 0")
    .refine((value) => Number.isFinite(value), {
        message: "Amount must be a finite number",
    })
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), {
        message: "Amount can have at most 2 decimal places",
    });

// Validates date-only values like 2026-05-06.
// Useful for transaction occurredAt if your UI collects date, not full datetime.
export const isoDateStringSchema = z.iso.date({
    message: "Date must be in YYYY-MM-DD format",
});
