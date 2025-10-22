import express from "express";
import {
    getForecast,
    getSavingRecommendations,
    getSpendingSummary,
} from "./ai.controller";
import { authenticate } from "../../middleware/authMiddleware";

const router = express.Router();

// Protect all routes under /dashboard/ai
router.use(authenticate);

//  GET /ai/test - Verifies Gemini API integration.
// router.get("/test", async (_, res) => {
//     try {
//         const output = await generateWithGemini(
//             "Write a one-line savings tip."
//         );
//         res.json({ success: true, output });
//     } catch (error: any) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// });

router.get("/spending-summary", getSpendingSummary);
router.get("/saving-recommendations", getSavingRecommendations);
router.get("/forecast", getForecast);

export default router;
