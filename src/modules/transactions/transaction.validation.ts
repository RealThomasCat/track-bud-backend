import { z } from "zod";
import {
    idSchema,
    moneySchema,
    paginationLimitSchema,
    rawDateRangeQuerySchema,
    toExclusiveUtcDayAfter,
    toUtcDayStart,
} from "../../utils/validation";

// OccurredAt can be either a date-only string (YYYY-MM-DD) or a full ISO datetime string.
const occurredAtSchema = z.string().refine(
    (value) => {
        const dateOnly = z.iso.date().safeParse(value).success;
        const dateTime = z.iso
            .datetime({ offset: true })
            .safeParse(value).success;

        return dateOnly || dateTime;
    },
    {
        message: "occurredAt must be either YYYY-MM-DD or a valid ISO datetime",
    },
);

export const createTransactionSchema = z.object({
    amount: moneySchema,
    categoryId: idSchema,
    kind: z.enum(["income", "expense"], {
        message: "kind must be either income or expense",
    }),
    note: z
        .string()
        .trim()
        .max(200, "Note must be less than 200 characters")
        .optional(),

    // Accept either:
    // - YYYY-MM-DD
    // - ISO datetime with timezone, e.g. 2026-04-05T18:30:00.000Z
    occurredAt: occurredAtSchema,
});

export const deleteTransactionSchema = z.object({
    id: idSchema,
});

export const getTransactionByIdSchema = z.object({
    id: idSchema,
});

// Validates query params for GET /transactions.
// limit is capped so clients cannot request unlimited rows.
export const getTransactionsQuerySchema = rawDateRangeQuerySchema
    .safeExtend({
        limit: paginationLimitSchema,
        // Cursor is the last transaction id from the previous page.
        cursor: idSchema.optional(),
        kind: z.enum(["income", "expense"]).optional(),
    })
    .transform((data) => ({
        ...data,
        startDate: data.startDate ? toUtcDayStart(data.startDate) : undefined,
        endDate: data.endDate
            ? toExclusiveUtcDayAfter(data.endDate)
            : undefined,
    }));

export const updateTransactionSchema = createTransactionSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required to update transaction",
    });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;
export type GetTransactionByIdInput = z.infer<typeof getTransactionByIdSchema>;
export type GetTransactionsQueryInput = z.infer<
    typeof getTransactionsQuerySchema
>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
