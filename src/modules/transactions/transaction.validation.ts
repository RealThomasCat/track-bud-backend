import { z } from "zod";
import {
    idSchema,
    moneySchema,
    paginationLimitSchema,
    rawDateRangeQuerySchema,
    toExclusiveUtcDayAfter,
    toUtcDayStart,
} from "../../utils/validation";

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
    // Store exact timestamp for the transaction.
    occurredAt: z.iso.datetime({
        message: "occurredAt must be a valid ISO datetime",
    }),
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
    .extend({
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

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;
export type GetTransactionByIdInput = z.infer<typeof getTransactionByIdSchema>;
export type GetTransactionsQueryInput = z.infer<
    typeof getTransactionsQuerySchema
>;
