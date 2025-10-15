import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import categoryRoutes from "../modules/categories/category.routes";
import transactionRoutes from "../modules/transactions/transaction.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";

const router = Router();

// Combine all feature routers
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/transactions", transactionRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
