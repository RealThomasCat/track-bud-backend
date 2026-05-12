import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware";
import {
    createCategory,
    deleteCategory,
    getCategories,
} from "./category.controller";
import { writeLimiter } from "../../middleware/rateLimitMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", getCategories);

router.post("/", writeLimiter, createCategory);
router.delete("/:id", writeLimiter, deleteCategory);

export default router;
