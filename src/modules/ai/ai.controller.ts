import { Request, Response, NextFunction } from "express";
import { aiDashboardQuerySchema } from "./ai.validation";
import {
    getSpendingSummaryService,
    getSavingRecommendationsService,
    getForecastService,
} from "./ai.service";

// --- GET SPENDING SUMMARY ---
export const getSpendingSummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsedQuery = aiDashboardQuerySchema.parse(req.query); // validates query params safely

        const result = await getSpendingSummaryService(userId, parsedQuery);

        res.status(200).json({
            success: true,
            type: "spending-summary",
            data: result,
            message: "AI spending summary generated successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- GET SAVING RECOMMENDATIONS ---
export const getSavingRecommendations = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsedQuery = aiDashboardQuerySchema.parse(req.query);

        const result = await getSavingRecommendationsService(
            userId,
            parsedQuery,
        );

        res.status(200).json({
            success: true,
            type: "saving-recommendations",
            data: result,
            message: "AI saving recommendations generated successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- GET FORECAST ---
export const getForecast = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsedQuery = aiDashboardQuerySchema.parse(req.query);

        const result = await getForecastService(userId, parsedQuery);

        res.status(200).json({
            success: true,
            type: "forecast",
            data: result,
            message: "AI forecast generated successfully",
        });
    } catch (error) {
        next(error);
    }
};
