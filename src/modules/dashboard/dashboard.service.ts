import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import {
    DashboardChartsInput,
    DashboardRecentActivityInput,
    DashboardSummaryInput,
    DashboardTopCategoriesInput,
} from "./dashboard.validation";

// Helper function to dynamically build the where clause for transaction queries based on userId and optional date range filters.
const buildDashboardTransactionWhere = (
    userId: number,
    startDate?: Date,
    endDate?: Date,
): Prisma.TransactionWhereInput => {
    return {
        userId,
        ...(startDate || endDate
            ? {
                  occurredAt: {
                      ...(startDate ? { gte: startDate } : {}),
                      ...(endDate ? { lt: endDate } : {}),
                  },
              }
            : {}),
    };
};

// --- GET SUMMARY ---
export const getDashboardSummaryService = async (
    userId: number,
    data: DashboardSummaryInput,
) => {
    // Extract date range from query parameters
    const { startDate, endDate } = data;

    // Use the dynamic where builder function to construct the where clause for transactions based on userId and optional date range filters.
    const where = buildDashboardTransactionWhere(userId, startDate, endDate);

    // Run three queries in parallel: one for total income, one for total expense, and one for transaction count
    // We use Promise.all() here to improve performance because all queries are independent and can safely run in parallel.
    // If we awaited them sequentially, it would take longer (sum of both query times instead of the max of both).
    const [income, expense, count] = await Promise.all([
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { ...where, kind: "income" },
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { ...where, kind: "expense" },
        }),
        prisma.transaction.count({
            where,
        }),
    ]);

    // Converts Decimal to Number and handles null case
    const totalIncome = Number(income._sum.amount ?? 0);
    const totalExpense = Number(expense._sum.amount ?? 0);

    return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: count,
    };
};

// --- GET CHARTS ---
export const getDashboardChartsService = async (
    userId: number,
    data: DashboardChartsInput,
) => {
    const { startDate, endDate } = data;

    const where = buildDashboardTransactionWhere(userId, startDate, endDate);

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
        where: { id: { in: categoryIds }, userId },
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
            total: Number(item._sum.amount ?? 0),
        };
    });

    // GROUP BY MONTH
    // Executes a raw SQL query (Postgres syntax) because Prisma groupBy can’t group by a computed field like YYYY-MM
    // We are now using safe raw query instead of unsafe raw query like before to prevent SQL injection risks
    // Extracts the month (YYYY-MM) from occurredAt
    // Sums income & expense separately per month
    // Returns sorted timeline data like: [{ month: "2023-01", income: 5000, expense: 2000 }, ...]
    const byMonth = await prisma.$queryRaw<
        { month: string; income: Prisma.Decimal; expense: Prisma.Decimal }[]
    >`
    SELECT
      to_char("occurredAt", 'YYYY-MM') AS month,
      SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END) AS expense
    FROM "Transaction"
    WHERE "userId" = ${userId}
    ${startDate ? Prisma.sql`AND "occurredAt" >= ${startDate}` : Prisma.empty}
    ${endDate ? Prisma.sql`AND "occurredAt" < ${endDate}` : Prisma.empty}
    GROUP BY month
    ORDER BY month ASC;
`;
    // NOTE:
    // -> to_char() is a PostgreSQL function that converts a date/timestamp into a text (string) in a specified format.
    // -> Here specified format is 'YYYY-MM' which extracts the year and month part of the occurredAt timestamp.

    // PostgreSQL decimal sums may come back as Prisma Decimal, so return frontend-friendly numbers
    const byMonthData = byMonth.map((item) => ({
        month: item.month,
        income: Number(item.income),
        expense: Number(item.expense),
    }));

    return {
        byCategory: byCategoryData,
        byMonth: byMonthData,
    };
};

// --- GET TOP CATEGORIES (BY EXPENSE) ---
export const getDashboardTopCategoriesService = async (
    userId: number,
    data: DashboardTopCategoriesInput,
) => {
    const { limit, startDate, endDate } = data;

    const where = buildDashboardTransactionWhere(userId, startDate, endDate);

    const topCategories = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where,
        orderBy: {
            _sum: {
                amount: "desc",
            },
        },
        take: limit,
    });

    const categoryIds = topCategories.map((c) => c.categoryId);

    const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds }, userId },
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
    data: DashboardRecentActivityInput,
) => {
    const { limit } = data;

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
