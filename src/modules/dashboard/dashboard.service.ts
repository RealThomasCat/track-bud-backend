import { prisma } from "../../config/db";
import {
    DashboardChartsInput,
    DashboardRecentActivityInput,
    DashboardSummaryInput,
    DashboardTopCategoriesInput,
} from "./dashboard.validation";

// --- GET SUMMARY ---
export const getDashboardSummaryService = async (
    userId: number,
    data: DashboardSummaryInput
) => {
    // Extract date range from query parameters
    const { startDate, endDate } = data.query || {};

    // Build a dynamic where clause based on presence of date filters for Prisma query
    // userId is always required to filter transactions for the specific user
    // Adds date range filter if both startDate and endDate are provided
    const where = {
        userId,
        ...(startDate && endDate
            ? {
                  occurredAt: {
                      gte: new Date(startDate),
                      lte: new Date(endDate),
                  },
              }
            : {}),
    };

    // Run two queries in parallel: one for total income and one for total expense
    // We use Promise.all() here to improve performance because both queries are independent and can safely run in parallel.
    // If we awaited them sequentially, it would take longer (sum of both query times instead of the max of both).
    const [income, expense] = await Promise.all([
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { ...where, kind: "income" },
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { ...where, kind: "expense" },
        }),
    ]);

    // Converts Decimal to Number and handles null case
    const totalIncome = Number(income._sum.amount ?? 0);
    const totalExpense = Number(expense._sum.amount ?? 0);

    return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
    };
};

// --- GET CHARTS ---
export const getDashboardChartsService = async (
    userId: number,
    data: DashboardChartsInput
) => {
    const { startDate, endDate } = data.query || {};

    // Filter by user (and optionally by date range)
    const where = {
        userId,
        ...(startDate && endDate
            ? {
                  occurredAt: {
                      gte: new Date(startDate),
                      lte: new Date(endDate),
                  },
              }
            : {}),
    };

    // GROUP BY CATEGORY
    // Returns total amount per category within the date range. Example:
    // [
    //   { categoryId: 1, _sum: { amount: 1200 } },
    //   { categoryId: 2, _sum: { amount: 2500 } }
    // ]
    const byCategory = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where,
    });

    // Extract only the category IDs from the grouped by category (ID) results
    // Example of categoryIds: [1, 2]
    const categoryIds = byCategory.map((c) => c.categoryId);

    // Fetch category names for the extracted category IDs
    // Example of categories: [{ id: 1, name: "Food" }, { id: 2, name: "Rent" }]
    const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
    });

    // Map category names and totals to produce readable data. Example:
    // [
    //   { "category": "Food", "total": 1200 },
    //   { "category": "Rent", "total": 2500 }
    // ]
    const byCategoryData = byCategory.map((item) => {
        // Find the category name for this categoryId
        const category = categories.find((c) => c.id === item.categoryId);

        // Return object with category name and total amount
        return {
            category: category?.name ?? "Unknown",
            total: item._sum.amount ?? 0,
        };
    });

    // GROUP BY MONTH
    // Executes a raw SQL query (Postgres syntax) because Prisma groupBy can’t group by a computed field like YYYY-MM
    // Extracts the month (YYYY-MM) from occurredAt
    // Sums income & expense separately per month
    // Returns sorted timeline data like: [{ month: "2023-01", income: 5000, expense: 2000 }, ...]
    const byMonth = await prisma.$queryRawUnsafe<
        { month: string; income: number; expense: number }[]
    >(`
    SELECT
      to_char("occurredAt", 'YYYY-MM') AS month,
      SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END) AS expense
    FROM "Transaction"
    WHERE "userId" = ${userId}
    ${
        startDate && endDate
            ? `AND "occurredAt" BETWEEN '${startDate}' AND '${endDate}'`
            : ""
    }
    GROUP BY month
    ORDER BY month ASC;
  `);
    // NOTE:
    // -> to_char() is a PostgreSQL function that converts a date/timestamp into a text (string) in a specified format.
    // -> Here specified format is 'YYYY-MM' which extracts the year and month part of the occurredAt timestamp.

    return {
        byCategory: byCategoryData,
        byMonth,
    };
};

// --- GET TOP CATEGORIES (BY EXPENSE) ---
export const getDashboardTopCategoriesService = async (
    userId: number,
    data: DashboardTopCategoriesInput
) => {
    const { limit, startDate, endDate } = data.query || {};

    const where = {
        userId,
        kind: "expense" as const,
        ...(startDate && endDate
            ? {
                  occurredAt: {
                      gte: new Date(startDate),
                      lte: new Date(endDate),
                  },
              }
            : {}),
    };

    const topCategories = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where,
        orderBy: {
            _sum: {
                amount: "desc",
            },
        },
        take: limit ?? 5,
    });

    const categoryIds = topCategories.map((c) => c.categoryId);
    const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
    });

    const result = topCategories.map((item) => {
        const category = categories.find((c) => c.id === item.categoryId);
        return {
            category: category?.name ?? "Unknown",
            total: Number(item._sum.amount ?? 0),
        };
    });

    return result;
};

// --- GET RECENT ACTIVITY ---
export const getDashboardRecentActivityService = async (
    userId: number,
    data: DashboardRecentActivityInput
) => {
    const { limit } = data.query || {};

    const recent = await prisma.transaction.findMany({
        where: { userId },
        // include block tells Prisma to also fetch each transaction’s category and wallet (foreign-key relations), but only their name fields.
        include: {
            category: { select: { name: true } },
            wallet: { select: { name: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: limit ?? 5,
    });

    return recent.map((txn) => ({
        id: txn.id,
        kind: txn.kind,
        amount: Number(txn.amount),
        note: txn.note,
        category: txn.category.name,
        wallet: txn.wallet.name,
        occurredAt: txn.occurredAt,
    }));
};
