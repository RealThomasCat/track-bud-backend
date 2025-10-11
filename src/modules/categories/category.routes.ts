import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware";
import {
    createCategory,
    deleteCategory,
    getCategories,
} from "./category.controller";

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(authenticate);

router.get("/", getCategories);
router.post("/", createCategory);
router.delete("/:id", deleteCategory);

export default router;
