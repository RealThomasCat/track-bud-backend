import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware";
import {
    getDashboardCharts,
    getDashboardSummary,
    getDashboardTopCategories,
    getDashboardRecentActivity,
} from "./dashboard.controller";
import { dashboardLimiter } from "../../middleware/rateLimitMiddleware";

const router = Router();

router.use(authenticate);
router.use(dashboardLimiter);

router.get("/summary", getDashboardSummary);
router.get("/charts", getDashboardCharts);
router.get("/top-categories", getDashboardTopCategories); // Top categories by expense
router.get("/recent-activity", getDashboardRecentActivity);

export default router;
