import { Request, Response, NextFunction } from "express";
import {
    getTransactionByIdService,
    getTransactionsService,
    createTransactionService,
    deleteTransactionService,
} from "./transaction.service";
import {
    createTransactionSchema,
    deleteTransactionSchema,
} from "./transaction.validation";

// --- GET TRANSACTIONS ---
export const getTransactions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.id!;
        const transactions = await getTransactionsService(userId);

        res.status(200).json({
            success: true,
            transactions,
            message: "Transactions retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- GET TRANSACTION BY ID ---
export const getTransactionById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.id!;
        const transaction = await getTransactionByIdService(
            userId,
            Number(req.params.id)
        );

        res.status(200).json({
            success: true,
            transaction,
            message: "Transaction retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- CREATE TRANSACTION ---
export const createTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.id!;
        const parsed = createTransactionSchema.parse(req.body);

        const transaction = await createTransactionService(userId, parsed);

        res.status(201).json({
            success: true,
            transaction,
            message: "Transaction created successfully",
        });
    } catch (error) {
        next(error);
    }
};

// --- DELETE TRANSACTION ---
export const deleteTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.id!;
        const parsed = deleteTransactionSchema.parse({
            id: Number(req.params.id),
        });

        await deleteTransactionService(userId, parsed);

        res.status(200).json({
            success: true,
            message: "Transaction deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};
