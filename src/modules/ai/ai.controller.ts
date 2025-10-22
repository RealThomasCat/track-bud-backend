import { Request, Response, NextFunction } from "express";
import { aiDashboardSchema } from "./ai.validation";
import {
    getSpendingSummaryService,
    getSavingRecommendationsService,
    getForecastService,
} from "./ai.service";
import safeJsonParse from "../../utils/safeJsonParse";

// --- GET SPENDING SUMMARY ---
export const getSpendingSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.id!;
        const parsed = aiDashboardSchema.parse({ query: req.query }); // validates query params safely

        const result = await getSpendingSummaryService(userId, parsed);
        res.status(200).json({
            success: true,
            type: "spending-summary",
            rawText: result, // Gemini’s full Markdown output
            data: safeJsonParse(result), // JSON parsed if valid
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
    next: NextFunction
) => {
    try {
        const userId = req.user?.id!;
        const parsed = aiDashboardSchema.parse({ query: req.query });

        const result = await getSavingRecommendationsService(userId, parsed);
        res.status(200).json({
            success: true,
            type: "saving-recommendations",
            rawText: result,
            data: safeJsonParse(result),
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
    next: NextFunction
) => {
    try {
        const userId = req.user?.id!;
        const parsed = aiDashboardSchema.parse({ query: req.query });

        const result = await getForecastService(userId, parsed);
        res.status(200).json({
            success: true,
            type: "forecast",
            rawText: result,
            data: safeJsonParse(result),
            message: "AI forecast generated successfully",
        });
    } catch (error) {
        next(error);
    }
};
