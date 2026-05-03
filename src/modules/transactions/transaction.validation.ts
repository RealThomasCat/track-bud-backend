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

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;
