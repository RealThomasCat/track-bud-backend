import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import {
    CreateTransactionInput,
    DeleteTransactionInput,
    GetTransactionsQueryInput,
} from "./transaction.validation";
import { AppError } from "../../utils/AppError";

// --- GET TRANSACTIONS ---
export const getTransactionsService = async (
    userId: number,
    query: GetTransactionsQueryInput,
) => {
    const { limit, cursor, kind, startDate, endDate } = query;
    // Validate cursor ownership before using it.
    // This prevents users from passing another user's transaction id as a cursor.
    if (cursor) {
        const cursorTransaction = await prisma.transaction.findFirst({
            where: {
                id: cursor,
                userId,
            },
            // Only return id to minimize data transfer since we only need to validate existence and ownership.
            select: {
                id: true,
            },
        });

        // If cursor transaction not found or doesn't belong to user, return 400 error.
        if (!cursorTransaction) {
            throw new AppError("Invalid transaction cursor", 400);
        }
    }

    // Prisma.TransactionWhereInput usage here because we can leverage it to conditionally add filters based on optional query params.
    // We are using it here because this where object is getting a bit complex with multiple optional filters,
    // and Prisma's type system allows us to build it incrementally in a type-safe way.
    const where: Prisma.TransactionWhereInput = {
        userId,
        ...(kind ? { kind } : {}),
        ...(startDate || endDate
            ? {
                  occurredAt: {
                      ...(startDate ? { gte: startDate } : {}),
                      ...(endDate ? { lt: endDate } : {}),
                  },
              }
            : {}),
    };

    const transactions = await prisma.transaction.findMany({
        where,
        // Deterministic ordering matters for pagination.
        // id breaks ties when multiple transactions have the same occurredAt.
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        // If cursor is provided, skip all rows up to and including the cursor transaction.
        ...(cursor
            ? {
                  cursor: {
                      id: cursor,
                  },
                  skip: 1,
              }
            : {}),
        // Fetch one extra row to know whether another page exists.
        take: limit + 1,
    });

    // Check if we have more rows than the limit, which indicates there is a next page.
    const hasNextPage = transactions.length > limit;

    // If there is a next page, remove the extra row before returning results.
    const paginatedTransactions = hasNextPage
        ? transactions.slice(0, limit)
        : transactions;

    // Id of the last transaction in the current page will be the next cursor for pagination.
    const lastTransaction = paginatedTransactions.at(-1);

    // The next cursor will be the id of the last transaction in the current page.
    const nextCursor =
        hasNextPage && lastTransaction ? lastTransaction.id : null;

    return {
        transactions: paginatedTransactions,
        pagination: {
            limit,
            nextCursor,
            hasNextPage,
        },
    };
};

// --- GET TRANSACTION BY ID ---
export const getTransactionByIdService = async (userId: number, id: number) => {
    const transaction = await prisma.transaction.findFirst({
        where: { id, userId },
    });

    if (!transaction) {
        throw new AppError("Transaction not found", 404);
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

    // Use the validated timestamp from the request.
    // Do not reset time to midnight because occurredAt should preserve when the transaction happened.
    const transactionDate = new Date(occurredAt);

    // Start a prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
        // Validate category ownership and non-archived
        const category = await tx.category.findFirst({
            where: { id: categoryId, userId, isArchived: false },
        });

        if (!category) {
            throw new AppError("Invalid or archived category", 404);
        }

        // Fetch default wallet
        const wallet = await tx.wallet.findFirst({
            where: { userId, isDefault: true },
        });

        if (!wallet) {
            throw new AppError("Default wallet not found", 404);
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
            throw new AppError("Transaction not found", 404);
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
