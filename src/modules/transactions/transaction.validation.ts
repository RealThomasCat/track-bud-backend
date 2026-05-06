import { z } from "zod";
import {
    idSchema,
    isoDateStringSchema,
    moneySchema,
    paginationLimitSchema,
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
export const getTransactionsQuerySchema = z
    .object({
        limit: paginationLimitSchema,
        // Cursor is the last transaction id from the previous page.
        cursor: idSchema.optional(),
        kind: z.enum(["income", "expense"]).optional(),
        // Query filters are date-only because users usually filter by calendar days.
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
    )
    .transform((data) => {
        const startDate = data.startDate
            ? new Date(`${data.startDate}T00:00:00.000Z`)
            : undefined;

        const endDate = data.endDate
            ? new Date(`${data.endDate}T00:00:00.000Z`)
            : undefined;

        // Convert inclusive calendar end date into exclusive timestamp upper bound.
        if (endDate) {
            endDate.setUTCDate(endDate.getUTCDate() + 1);
        }

        return {
            ...data,
            startDate,
            endDate,
        };
    });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;
export type GetTransactionByIdInput = z.infer<typeof getTransactionByIdSchema>;
export type GetTransactionsQueryInput = z.infer<
    typeof getTransactionsQuerySchema
>;
