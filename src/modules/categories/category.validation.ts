import { z } from "zod";
import { idSchema } from "../../utils/validation";

export const createCategorySchema = z.strictObject({
    name: z
        .string()
        .trim()
        .min(1, { message: "Category name is required" })
        .max(50, { message: "Category name must be less than 50 characters" })
        .transform((value) => value.toLowerCase()),
});

export const deleteCategorySchema = z.strictObject({
    id: idSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
