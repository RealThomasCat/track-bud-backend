import { z } from "zod";

export const createTransactionSchema = z.object({
    amount: z.number().positive(),
    categoryId: z.number(),
    kind: z.enum(["income", "expense"]),
    note: z.string().optional(),
    occurredAt: z.string().pipe(z.coerce.date()).optional(),
});

export const deleteTransactionSchema = z.object({
    id: z.number(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;
