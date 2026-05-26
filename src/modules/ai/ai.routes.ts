import express from "express";
import {
    getForecast,
    getSavingRecommendations,
    getSpendingSummary,
} from "./ai.controller";
import {
    createMonthlyReview,
    getCurrentMonthlyReview,
    getMonthlyReviewById,
} from "./monthlyReview/monthlyReview.controller";
import { authenticate } from "../../middleware/authMiddleware";
import { aiLimiter } from "../../middleware/rateLimitMiddleware";

const router = express.Router();

router.use(authenticate);

// Apply rate limiter to all AI routes.
// Applying the limiter at the router level means that all routes defined in this file will share the same rate limit quota.
router.use(aiLimiter);

router.get("/spending-summary", getSpendingSummary);
router.get("/saving-recommendations", getSavingRecommendations);
router.get("/forecast", getForecast);

// Monthly Review
router.post("/monthly-review", createMonthlyReview);
router.get("/monthly-review/current", getCurrentMonthlyReview);
router.get("/monthly-review/:id", getMonthlyReviewById);

export default router;
