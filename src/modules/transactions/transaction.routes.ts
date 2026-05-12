import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware";
import {
    createTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactions,
} from "./transaction.controller";
import { writeLimiter } from "../../middleware/rateLimitMiddleware";

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(authenticate);

router.get("/", getTransactions);
router.get("/:id", getTransactionById);

// Apply writeLimiter to routes that modify data (POST, PATCH, DELETE)
router.post("/", writeLimiter, createTransaction);
router.delete("/:id", writeLimiter, deleteTransaction);

export default router;
