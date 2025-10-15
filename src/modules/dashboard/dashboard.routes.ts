import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware";
import {
    getDashboardCharts,
    getDashboardSummary,
} from "./dashboard.controller";

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(authenticate);

router.get("/summary", getDashboardSummary);
router.get("/charts", getDashboardCharts);

export default router;
