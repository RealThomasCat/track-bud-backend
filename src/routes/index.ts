import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";

const router = Router();

// Combine all feature routers
router.use("/auth", authRoutes);

export default router;
