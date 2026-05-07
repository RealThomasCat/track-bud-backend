import { Request, Response, NextFunction } from "express";
import {
    getDashboardChartsService,
    getDashboardRecentActivityService,
    getDashboardSummaryService,
    getDashboardTopCategoriesService,
} from "./dashboard.service";
import {
    dashboardChartsQuerySchema,
    dashboardSummaryQuerySchema,
    dashboardTopCategoriesQuerySchema,
    dashboardRecentActivityQuerySchema,
} from "./dashboard.validation";

// --- GET SUMMARY ---
export const getDashboardSummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsedQuery = dashboardSummaryQuerySchema.parse(req.query);

        const summary = await getDashboardSummaryService(userId, parsedQuery);

        res.status(200).json({
            success: true,
            summary,
            message: "Dashboard summary retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- GET CHARTS ---
export const getDashboardCharts = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsedQuery = dashboardChartsQuerySchema.parse(req.query);

        const charts = await getDashboardChartsService(userId, parsedQuery);

        res.status(200).json({
            success: true,
            charts,
            message: "Dashboard charts retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- GET TOP CATEGORIES (BY EXPENSE) ---
export const getDashboardTopCategories = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsedQuery = dashboardTopCategoriesQuerySchema.parse(req.query);

        const topCategories = await getDashboardTopCategoriesService(
            userId,
            parsedQuery,
        );

        res.status(200).json({
            success: true,
            topCategories,
            message: "Top categories retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- GET RECENT ACTIVITY ---
export const getDashboardRecentActivity = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsedQuery = dashboardRecentActivityQuerySchema.parse(req.query);

        const recentActivity = await getDashboardRecentActivityService(
            userId,
            parsedQuery,
        );

        res.status(200).json({
            success: true,
            recentActivity,
            message: "Dashboard recent activity retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};
