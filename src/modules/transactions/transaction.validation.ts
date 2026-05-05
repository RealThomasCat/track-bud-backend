import { z } from "zod";

export const createTransactionSchema = z.object({
    amount: z.coerce.number().positive(),
    categoryId: z.coerce.number().int().positive(),
    kind: z.enum(["income", "expense"]),
    note: z.string().trim().optional(),
    occurredAt: z
        .string()
        .pipe(
            z.coerce.date({ message: "occurredAt must be a valid ISO date" }),
        ),
});

export const deleteTransactionSchema = z.object({
    id: z.coerce.number().int().positive(),
});

// Validates query params for GET /transactions.
// limit is capped so clients cannot request unlimited rows.
export const getTransactionsQuerySchema = z
    .object({
        limit: z.coerce.number().int().min(1).max(50).default(20),
        // Cursor is the last transaction id from the previous page.
        cursor: z.coerce.number().int().positive().optional(),
        kind: z.enum(["income", "expense"]).optional(),
        startDate: z
            .string()
            .pipe(
                z.coerce.date({
                    message: "startDate must be a valid ISO date",
                }),
            )
            .optional(),
        endDate: z
            .string()
            .pipe(
                z.coerce.date({
                    message: "endDate must be a valid ISO date",
                }),
            )
            .optional(),
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

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;
export type GetTransactionsQueryInput = z.infer<
    typeof getTransactionsQuerySchema
>;
