import { Router } from "express";
import { signup, login, logout, me } from "./auth.controller";
import { authenticate } from "../../middleware/authMiddleware";
import {
    loginLimiter,
    signupLimiter,
} from "../../middleware/rateLimitMiddleware";

const router = Router();

// Public routes with ip-based rate limiting
router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);

// Protected routes (require cookie JWT)
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
