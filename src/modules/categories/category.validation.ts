import { z } from "zod";

export const createCategorySchema = z.object({
    name: z
        .string()
        .min(1, "Category name is required")
        .max(50, "Category name must be less than 50 characters"),
});

export const deleteCategorySchema = z.object({
    id: z.number(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
