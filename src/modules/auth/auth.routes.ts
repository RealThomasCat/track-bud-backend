import { Router } from "express";
import { signup, login, logout, me } from "./auth.controller";
import { authenticate } from "../../middleware/authMiddleware";

const router = Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected routes (require cookie JWT)
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
