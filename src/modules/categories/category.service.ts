import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import {
    CreateCategoryInput,
    DeleteCategoryInput,
} from "./category.validation";
import { normalizeCategoryName } from "../../utils/categoryName";

const categoryResponseSelect = {
    id: true,
    userId: true,
    name: true,
    isDefault: true,
    isArchived: true,
    createdAt: true,
    updatedAt: true,
} as const;

// --- GET CATEGORIES ---
export const getCategoriesService = async (userId: number) => {
    const categories = await prisma.category.findMany({
        where: { userId, isArchived: false },
        orderBy: { createdAt: "desc" },
        select: categoryResponseSelect,
    });

    return categories;
};

// --- CREATE CATEGORY ---
export const createCategoryService = async (
    userId: number,
    data: CreateCategoryInput,
) => {
    const normalizedName = normalizeCategoryName(data.name);

    try {
        // NOTE: We are not manually checking for existing category names here.
        // The database has a unique constraint on (userId, normalizedName)
        // which will throw an error if a duplicate is attempted to be created.

        // We are using only one db call here for solving race condition and performance.
        // The unique constraint will ensure that even if two requests come in
        // simultaneously with the same category name, only one will succeed.

        // In signup code, the risk of race condition is minimal as users are created
        // So there we can afford to do a pre-check. But here, categories can be created more frequently

        const category = await prisma.category.create({
            data: {
                userId,
                name: data.name,
                normalizedName,
                isDefault: false,
            },
            select: categoryResponseSelect,
        });

        return category;
    } catch (error: any) {
        // Handle unique constraint violation (e.g., duplicate normalized category name)
        if (error.code !== "P2002") {
            throw error;
        }

        // Check if the existing category with the same normalized name is archived.
        const existingCategory = await prisma.category.findFirst({
            where: {
                userId,
                normalizedName,
            },
            select: {
                isArchived: true,
            },
        });

        // If an archived category with the same name exists, throw a specific error message
        if (existingCategory?.isArchived) {
            throw new AppError(
                "A category with this name already exists but is archived. Restore it instead of creating a duplicate.",
                409,
            );
        }

        // Else throw generic error for this service
        throw new AppError("Category name already exists", 409);
    }
};

// --- DELETE CATEGORY ---
export const deleteCategoryService = async (
    userId: number,
    data: DeleteCategoryInput,
) => {
    // Check if category exists, belongs to the user and is not already archived
    const existing = await prisma.category.findFirst({
        where: { id: data.id, userId, isArchived: false },
    });

    if (!existing) {
        throw new AppError("Category not found", 404);
    }

    // Prevent deletion of default categories
    if (existing.isDefault) {
        throw new AppError("Default categories cannot be deleted", 403);
    }

    // Soft delete: Mark the category as archived instead of deleting it
    const updatedCategory = await prisma.category.update({
        where: { id: data.id },
        data: { isArchived: true },
        select: categoryResponseSelect,
    });

    return updatedCategory;
};
