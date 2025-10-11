import { prisma } from "../../config/db";
import {
    CreateCategoryInput,
    DeleteCategoryInput,
} from "./category.validation";

// --- GET CATEGORIES ---
export const getCategoriesService = async (userId: number) => {
    const categories = await prisma.category.findMany({
        where: { userId, isArchived: false },
        orderBy: { createdAt: "desc" },
    });

    if (!categories) {
        const err = new Error("No categories found");
        (err as any).statusCode = 404;
        throw err;
    }

    return categories;
};

// --- CREATE CATEGORY ---
export const createCategoryService = async (
    userId: number,
    data: CreateCategoryInput
) => {
    try {
        // NOTE: We are not manually checking for exsisting category names here.
        // The database has a unique constraint on (userId, name) which will throw
        // an error if a duplicate is attempted to be created.

        // We are using only one db call here for solving race condition and performance.
        // The unique constraint will ensure that even if two requests come in
        // simultaneously with the same category name, only one will succeed.

        // In signup code, the risk of race condition is minimal as users are created
        // So there we can afford to do a pre-check. But here, categories can be created more frequently

        const category = await prisma.category.create({
            data: { userId, name: data.name, isDefault: false },
        });

        return category;
    } catch (error: any) {
        // Handle unique constraint violation (e.g., duplicate category name)
        if (error.code === "P2002") {
            const err = new Error("Category name already exists");
            (err as any).statusCode = 400;
            throw err;
        }
        throw error;
    }
};

// --- DELETE CATEGORY ---
export const deleteCategoryService = async (
    userId: number,
    data: DeleteCategoryInput
) => {
    // Check if category exists, belongs to the user and is not already archived
    const existing = await prisma.category.findFirst({
        where: { id: data.id, userId, isArchived: false },
    });

    if (!existing) {
        const err = new Error("Category not found");
        (err as any).statusCode = 404;
        throw err;
    }

    // Prevent deletion of default categories
    if (existing.isDefault) {
        const err = new Error("Default categories cannot be deleted");
        (err as any).statusCode = 403;
        throw err;
    }

    // Soft delete: Mark the category as archived instead of deleting it
    const updatedCategory = await prisma.category.update({
        where: { id: data.id },
        data: { isArchived: true },
    });

    return updatedCategory;
};
