import { Request, Response, NextFunction } from "express";
import {
    createMonthlyReviewService,
    getCurrentMonthlyReviewService,
    getMonthlyReviewByIdService,
} from "./monthlyReview.service";
import {
    createMonthlyReviewSchema,
    getMonthlyReviewByIdSchema,
} from "./monthlyReview.validation";

// --- POST MONTHLY REVIEW ---
export const createMonthlyReview = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        createMonthlyReviewSchema.parse(req.body ?? {});

        const result = await createMonthlyReviewService(userId);

        res.status(result.created ? 202 : 200).json({
            success: true,
            type: "monthly-review",
            data: result.review,
            message: result.created
                ? "Monthly review generation started"
                : "Monthly review already exists for this period",
        });
    } catch (error) {
        next(error);
    }
};

// --- GET CURRENT MONTHLY REVIEW ---
export const getCurrentMonthlyReview = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;

        const result = await getCurrentMonthlyReviewService(userId);

        res.status(200).json({
            success: true,
            type: "monthly-review",
            data: result,
            message: result.review
                ? "Monthly review retrieved successfully"
                : "Monthly review has not been generated for this period",
        });
    } catch (error) {
        next(error);
    }
};

// --- GET MONTHLY REVIEW BY ID ---
export const getMonthlyReviewById = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id!;
        const parsedParams = getMonthlyReviewByIdSchema.parse(req.params);

        const review = await getMonthlyReviewByIdService(
            userId,
            parsedParams.id,
        );

        res.status(200).json({
            success: true,
            type: "monthly-review",
            data: review,
            message: "Monthly review retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};
