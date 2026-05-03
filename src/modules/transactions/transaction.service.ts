import { prisma } from "../../config/db";
import {
    CreateTransactionInput,
    DeleteTransactionInput,
} from "./transaction.validation";

// --- GET TRANSACTIONS ---
export const getTransactionsService = async (userId: number) => {
    const transactions = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { occurredAt: "desc" },
    });

    if (!transactions) {
        const err = new Error("No transactions found");
        (err as any).statusCode = 404;
        throw err;
    }

    return transactions;
};

// --- GET TRANSACTION BY ID ---
export const getTransactionByIdService = async (userId: number, id: number) => {
    const transaction = await prisma.transaction.findFirst({
        where: { id, userId },
    });

    if (!transaction) {
        const err = new Error("Transaction not found");
        (err as any).statusCode = 404;
        throw err;
    }

    return transaction;
};

// --- CREATE TRANSACTION ---
export const createTransactionService = async (
    userId: number,
    data: CreateTransactionInput,
) => {
    // Extract the relevant fields from the input data
    const { amount, categoryId, kind, note, occurredAt } = data;

    // Prepare occurredAt
    let transactionDate: Date;
    if (occurredAt) {
        transactionDate = new Date(occurredAt);
        transactionDate.setHours(0, 0, 0, 0); // reset time to midnight
    } else {
        transactionDate = new Date(); // current date-time
    }

    // Start a prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
        // Validate category ownership and non-archived
        const category = await tx.category.findFirst({
            where: { id: categoryId, userId, isArchived: false },
        });

        if (!category) {
            const err = new Error("Invalid or archived category");
            (err as any).statusCode = 404;
            throw err;
        }

        // Fetch default wallet
        const wallet = await tx.wallet.findFirst({
            where: { userId, isDefault: true },
        });

        if (!wallet) {
            const err = new Error("Wallet not found");
            (err as any).statusCode = 404;
            throw err;
        }

        // Create the transaction record
        const transaction = await tx.transaction.create({
            data: {
                userId,
                walletId: wallet.id,
                categoryId,
                kind,
                amount,
                note: note ?? null, // set to null if undefined
                occurredAt: transactionDate,
            },
        });

        // Atomically update wallet balance inside the same DB transaction.
        // This avoids read-modify-write race conditions under concurrent requests.
        await tx.wallet.update({
            where: { id: wallet.id },
            data: {
                balance:
                    kind === "income"
                        ? { increment: amount }
                        : { decrement: amount },
            },
        });

        return transaction;
    });

    return result;
};

// --- DELETE TRANSACTION ---
export const deleteTransactionService = async (
    userId: number,
    data: DeleteTransactionInput,
) => {
    const { id } = data;

    await prisma.$transaction(async (tx) => {
        // Fetch transaction
        const transaction = await tx.transaction.findFirst({
            where: { id, userId },
        });

        if (!transaction) {
            const err = new Error("Transaction not found");
            (err as any).statusCode = 404;
            throw err;
        }

        // Delete the transaction
        await tx.transaction.delete({ where: { id: transaction.id } });

        // Reverse the original transaction impact atomically.
        await tx.wallet.update({
            where: { id: transaction.walletId },
            data: {
                balance:
                    transaction.kind === "income"
                        ? { decrement: transaction.amount }
                        : { increment: transaction.amount },
            },
        });
    });

    return { message: "Transaction deleted successfully" };
};
