import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import categoryRoutes from "../modules/categories/category.routes";

const router = Router();

// Combine all feature routers
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);

export default router;
