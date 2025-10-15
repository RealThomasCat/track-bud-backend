import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware";
import {
    getDashboardCharts,
    getDashboardSummary,
    getDashboardTopCategories,
    getDashboardRecentActivity,
} from "./dashboard.controller";

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(authenticate);

router.get("/summary", getDashboardSummary);
router.get("/charts", getDashboardCharts);
router.get("/top-categories", getDashboardTopCategories); // Top categories by expense
router.get("/recent-activity", getDashboardRecentActivity);

export default router;
