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
    data: CreateTransactionInput
) => {
    // Extract the relevant fields from the input data
    const { amount, categoryId, kind, note, occurredAt } = data;

    // Validate category ownership and non-archived
    const category = await prisma.category.findFirst({
        where: { id: categoryId, userId, isArchived: false },
    });
    if (!category) {
        const err = new Error("Invalid or archived category");
        (err as any).statusCode = 404;
        throw err;
    }

    // Fetch default wallet
    const wallet = await prisma.wallet.findFirst({
        where: { userId, isDefault: true },
    });
    if (!wallet) {
        const err = new Error("Wallet not found");
        (err as any).statusCode = 404;
        throw err;
    }

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

        // Update wallet balance
        const newBalance =
            kind === "income"
                ? wallet.balance.plus(amount)
                : wallet.balance.minus(amount);

        await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: newBalance },
        });

        return transaction;
    });

    return result;
};

// --- DELETE TRANSACTION ---
export const deleteTransactionService = async (
    userId: number,
    data: DeleteTransactionInput
) => {
    const { id } = data;

    // Fetch transaction
    const transaction = await prisma.transaction.findFirst({
        where: { id, userId },
        include: { wallet: true },
    });
    if (!transaction) {
        const err = new Error("Transaction not found");
        (err as any).statusCode = 404;
        throw err;
    }

    // Reverse wallet balance adjustment
    const { wallet, kind, amount } = transaction;

    await prisma.$transaction(async (tx) => {
        // Delete the transaction
        await tx.transaction.delete({ where: { id: transaction.id } });

        const newBalance =
            kind === "income"
                ? wallet.balance.minus(amount)
                : wallet.balance.plus(amount);

        await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: newBalance },
        });
    });

    return { message: "Transaction deleted successfully" };
};
