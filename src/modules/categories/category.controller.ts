import { Request, Response, NextFunction } from "express";
import {
    createCategoryService,
    deleteCategoryService,
    getCategoriesService,
} from "./category.service";
import {
    createCategorySchema,
    deleteCategorySchema,
} from "./category.validation";

// --- GET CATEGORIES ---
export const getCategories = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const categories = await getCategoriesService(userId);

        res.status(200).json({
            success: true,
            categories,
            message: "Categories retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- CREATE CATEGORY ---
export const createCategory = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsed = createCategorySchema.parse(req.body);

        const category = await createCategoryService(userId, parsed);

        res.status(201).json({
            success: true,
            category,
            message: "Category created successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- DELETE CATEGORY ---
export const deleteCategory = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsed = deleteCategorySchema.parse(req.params);

        const category = await deleteCategoryService(userId, parsed);

        res.status(200).json({
            success: true,
            category,
            message: "Category deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};
