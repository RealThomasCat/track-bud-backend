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

// Smaller limit for dashboard widgets like recent activity and top categories.
export const dashboardLimitSchema = z.coerce
    .number({
        message: "Limit must be a number",
    })
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(20, "Limit cannot be greater than 20")
    .default(5);

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
// Useful for calendar date filters such as startDate and endDate.
export const isoDateStringSchema = z.iso.date({
    message: "Date must be in YYYY-MM-DD format",
});

// Converts a date-only string into the start of that UTC day.
export const toUtcDayStart = (date: string): Date => {
    return new Date(`${date}T00:00:00.000Z`);
};

// Converts an inclusive calendar end date into an exclusive upper bound.
// Example: 2026-05-31 -> 2026-06-01T00:00:00.000Z
export const toExclusiveUtcDayAfter = (date: string): Date => {
    const endDate = toUtcDayStart(date);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    return endDate;
};

// Reusable raw date range fields before transformation.
export const rawDateRangeQuerySchema = z
    .strictObject({
        startDate: isoDateStringSchema.optional(),
        endDate: isoDateStringSchema.optional(),
    })
    .refine(
        (data) => {
            if (!data.startDate || !data.endDate) return true;
            return data.startDate <= data.endDate;
        },
        {
            message: "startDate must be before or equal to endDate",
            path: ["startDate"],
        },
    );

// Reusable calendar date range filter.
// Converts:
// startDate=2026-05-01 -> 2026-05-01T00:00:00.000Z
// endDate=2026-05-31   -> 2026-06-01T00:00:00.000Z
export const dateRangeQuerySchema = rawDateRangeQuerySchema.transform(
    (data) => ({
        startDate: data.startDate ? toUtcDayStart(data.startDate) : undefined,
        endDate: data.endDate
            ? toExclusiveUtcDayAfter(data.endDate)
            : undefined,
    }),
);
