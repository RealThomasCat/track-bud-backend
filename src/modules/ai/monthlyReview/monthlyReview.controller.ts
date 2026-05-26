import { Request, Response, NextFunction } from "express";
import { createMonthlyReviewService } from "./monthlyReview.service";
import { createMonthlyReviewSchema } from "./monthlyReview.validation";

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
