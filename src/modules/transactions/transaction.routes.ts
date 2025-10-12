import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware";
import {
    createTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactions,
} from "./transaction.controller";

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(authenticate);

router.get("/", getTransactions);
router.post("/", createTransaction);
router.get("/:id", getTransactionById);
router.delete("/:id", deleteTransaction);

export default router;
