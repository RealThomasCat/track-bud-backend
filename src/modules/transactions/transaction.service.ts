import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import {
    CreateTransactionInput,
    DeleteTransactionInput,
    GetTransactionsQueryInput,
    UpdateTransactionInput,
} from "./transaction.validation";
import { AppError } from "../../utils/AppError";
import { deleteCacheByPattern } from "../../utils/cache";
import { getDashboardUserCachePattern } from "../dashboard/dashboard.cache";
import { getAIUserCachePattern } from "../ai/ai.cache";

// Helper function to determine if a string is in YYYY-MM-DD format (date-only).
const isDateOnly = (value: string): boolean => {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

// Helper function to convert date-only string to UTC midnight Date object.
const toTransactionDate = (occurredAt: string): Date => {
    // If user only provided a date, store that financial date at UTC midnight.
    if (isDateOnly(occurredAt)) {
        return new Date(`${occurredAt}T00:00:00.000Z`);
    }

    // If user provided full datetime, preserve the provided timestamp.
    return new Date(occurredAt);
};

// --- GET TRANSACTIONS ---
export const getTransactionsService = async (
    userId: number,
    query: GetTransactionsQueryInput,
) => {
    const { limit, cursor, kind, startDate, endDate } = query;

    // TODO: For stronger pagination correctness, replace id-only cursor with an opaque cursor containing both occurredAt and id.
    // This protects pagination if the cursor row is deleted or its occurredAt changes between requests.

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

    // Convert occurredAt to a Date object, handling both date-only and datetime inputs.
    const transactionDate = toTransactionDate(occurredAt);

    // Start a prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
        // Validate category ownership and non-archived
        const category = await tx.category.findFirst({
            where: {
                id: categoryId,
                userId,
            },
            select: {
                id: true,
                isArchived: true,
            },
        });

        if (!category) {
            throw new AppError("Category not found", 404);
        }

        // If category is archived, ask user to unarchive it before using.
        if (category.isArchived) {
            throw new AppError(
                "This category is archived. Restore it before using it for a transaction.",
                409,
            );
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

    // Invalidate cache only after the DB transaction succeeds. This prevents stale cache data after a new transaction.
    // try-catch block because cache invalidation should not fail the successful DB operation.
    try {
        await Promise.all([
            deleteCacheByPattern(getDashboardUserCachePattern(userId)),
            deleteCacheByPattern(getAIUserCachePattern(userId)),
        ]);
    } catch (error) {
        // Only log error on cache invalidation failure, don't throw.
        console.error(
            "Cache invalidation failed after transaction mutation:",
            error,
        );
    }

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

    // Invalidate cache only after deletion and wallet reversal succeed.
    try {
        await Promise.all([
            deleteCacheByPattern(getDashboardUserCachePattern(userId)),
            deleteCacheByPattern(getAIUserCachePattern(userId)),
        ]);
    } catch (error) {
        console.error(
            "Cache invalidation failed after transaction mutation:",
            error,
        );
    }

    return { message: "Transaction deleted successfully" };
};

// --- UPDATE TRANSACTION ---
export const updateTransactionService = async (
    userId: number,
    id: number,
    data: UpdateTransactionInput,
) => {
    const result = await prisma.$transaction(async (tx) => {
        // Fetch existing transaction with ownership check.
        const existingTransaction = await tx.transaction.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!existingTransaction) {
            throw new AppError("Transaction not found", 404);
        }

        // Only validate category when the user is changing categoryId.
        // PATCH clients should ideally send only changed fields, but this also handles clients that send the existing categoryId unchanged.
        if (data.categoryId !== undefined) {
            const category = await tx.category.findFirst({
                where: {
                    id: data.categoryId,
                    userId,
                },
                select: {
                    id: true,
                    isArchived: true,
                },
            });

            if (!category) {
                throw new AppError("Category not found", 404);
            }

            if (category.isArchived) {
                throw new AppError(
                    "This category is archived. Restore it before using it for a transaction.",
                    409,
                );
            }
        }

        // Updated transaction data
        const updatedKind = data.kind ?? existingTransaction.kind;
        const updatedAmount = data.amount ?? existingTransaction.amount;
        const updatedCategoryId =
            data.categoryId ?? existingTransaction.categoryId;
        const updatedNote =
            data.note === undefined ? existingTransaction.note : data.note;
        const updatedOccurredAt =
            data.occurredAt === undefined
                ? existingTransaction.occurredAt
                : toTransactionDate(data.occurredAt);

        // Reverse old wallet impact first.
        await tx.wallet.update({
            where: {
                id: existingTransaction.walletId,
            },
            data: {
                balance:
                    existingTransaction.kind === "income"
                        ? { decrement: existingTransaction.amount }
                        : { increment: existingTransaction.amount },
            },
        });

        // Update transaction after reversing old impact.
        const updatedTransaction = await tx.transaction.update({
            where: {
                id: existingTransaction.id,
            },
            data: {
                categoryId: updatedCategoryId,
                kind: updatedKind,
                amount: updatedAmount,
                note: updatedNote,
                occurredAt: updatedOccurredAt,
            },
        });

        // Apply new wallet impact atomically.
        await tx.wallet.update({
            where: {
                id: existingTransaction.walletId,
            },
            data: {
                balance:
                    updatedKind === "income"
                        ? { increment: updatedAmount }
                        : { decrement: updatedAmount },
            },
        });

        return updatedTransaction;
    });

    // Invalidate cache
    try {
        await Promise.all([
            deleteCacheByPattern(getDashboardUserCachePattern(userId)),
            deleteCacheByPattern(getAIUserCachePattern(userId)),
        ]);
    } catch (error) {
        console.error(
            "Cache invalidation failed after transaction mutation:",
            error,
        );
    }

    return result;
};
