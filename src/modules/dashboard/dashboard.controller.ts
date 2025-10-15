import { Request, Response, NextFunction } from "express";
import {
    getDashboardChartsService,
    getDashboardSummaryService,
} from "./dashboard.service";
import {
    dashboardChartsSchema,
    dashboardSummarySchema,
} from "./dashboard.validation";

// --- GET SUMMARY ---
export const getDashboardSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.id!;
        const parsed = dashboardSummarySchema.parse({ query: req.query }); // Write explanation for {query: req.query}

        const summary = await getDashboardSummaryService(userId, parsed);

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
    next: NextFunction
) => {
    try {
        const userId = req.user?.id!;
        const parsed = dashboardChartsSchema.parse({ query: req.query });

        const charts = await getDashboardChartsService(userId, parsed);

        res.status(200).json({
            success: true,
            charts,
            message: "Dashboard charts retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};
