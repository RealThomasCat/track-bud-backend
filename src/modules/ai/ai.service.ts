import { prisma } from "../../config/db";
import { generateStructuredWithGemini } from "../../config/gemini";
import type { AIDashboardQueryInput } from "./ai.validation";
import { TransactionKind } from "@prisma/client"; //Import enum from Prisma client
import {
    aiInsightSchema,
    aiForecastSchema,
    aiInsightResponseSchema,
    aiSavingRecommendationsResponseSchema,
    aiSavingRecommendationsSchema,
    aiForecastResponseSchema,
} from "./ai.output";

// Utility: builds date filter dynamically.
// endDate is already transformed into the exclusive next-day boundary.
function buildDateFilter(data: AIDashboardQueryInput) {
    const { startDate, endDate } = data;

    return {
        ...(startDate || endDate
            ? {
                  occurredAt: {
                      ...(startDate ? { gte: startDate } : {}),
                      ...(endDate ? { lt: endDate } : {}),
                  },
              }
            : {}),
    };
}

// --- SPENDING SUMMARY ---
export const getSpendingSummaryService = async (
    userId: number,
    data: AIDashboardQueryInput,
) => {
    const where = {
        userId,
        kind: TransactionKind.expense,
        ...buildDateFilter(data),
    };

    // Group by category to get spending per category
    const spendingData = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where,
    });

    // If no spending data, return early with a default message and empty insights.
    if (spendingData.length === 0) {
        return {
            summary: "No expenses recorded for this period.",
            insights: [],
        };
    }

    // Fetch category names for better AI insights
    const categoryIds = spendingData.map((item) => item.categoryId);

    const categories = await prisma.category.findMany({
        where: {
            userId,
            id: { in: categoryIds },
        },
        select: {
            id: true,
            name: true,
        },
    });

    const categoryNameById = new Map(
        categories.map((category) => [category.id, category.name]),
    );

    // Prepare concise dataset for AI
    const formattedData = spendingData.map((item) => ({
        category: categoryNameById.get(item.categoryId) ?? "Unknown",
        total: Number(item._sum.amount ?? 0),
    }));

    // Compose prompt for Gemini API
    const prompt = `
You are a personal finance assistant.
        Summarize this user's spending in 3 to 5 short insights for dashboard display.

        Use only the provided data. Do not invent categories or amounts.

Data:
${JSON.stringify(formattedData)}
`;

    return generateStructuredWithGemini({
        prompt,
        schema: aiInsightSchema,
        responseSchema: aiInsightResponseSchema,
        systemInstruction:
            "Return concise personal finance insights as structured JSON only.",
    });
};

// --- SAVING RECOMMENDATIONS ---
export const getSavingRecommendationsService = async (
    userId: number,
    data: AIDashboardQueryInput,
) => {
    const where = {
        userId,
        kind: TransactionKind.expense,
        ...buildDateFilter(data),
    };

    const spendingData = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where,
    });

    if (spendingData.length === 0) {
        return {
            summary: "No expenses recorded for this period.",
            tips: [],
        };
    }

    const categoryIds = spendingData.map((item) => item.categoryId);

    const categories = await prisma.category.findMany({
        where: {
            userId,
            id: { in: categoryIds },
        },
        select: {
            id: true,
            name: true,
        },
    });

    const categoryNameById = new Map(
        categories.map((category) => [category.id, category.name]),
    );

    const formattedData = spendingData.map((item) => ({
        category: categoryNameById.get(item.categoryId) ?? "Unknown",
        total: Number(item._sum.amount ?? 0),
    }));

    const prompt = `
You are a financial advisor.
        Suggest 3 practical saving tips based on this user's spending data.

        Use only the provided data. Do not invent categories or amounts.

Data:
${JSON.stringify(formattedData)}
`;

    return generateStructuredWithGemini({
        prompt,
        schema: aiSavingRecommendationsSchema,
        responseSchema: aiSavingRecommendationsResponseSchema,
        systemInstruction:
            "Return concise personal finance saving recommendations as structured JSON only.",
    });
};

// --- FORECAST ---
export const getForecastService = async (
    userId: number,
    data: AIDashboardQueryInput,
) => {
    // Default forecast window: last 6 months ending today.
    // If the client sends a date range, we respect that range instead.
    const toDate = data.endDate ?? new Date();

    // Calculate fromDate based on toDate to ensure we always have a 6-month window if startDate is not provided
    const fromDate =
        data.startDate ??
        new Date(
            Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth() - 5, 1),
        );

    // Fetch total monthly expenses for the last 6 months
    const trendData = await prisma.$queryRaw<
        { month: string; total: unknown }[]
    >`
        SELECT
            TO_CHAR(DATE_TRUNC('month', "occurredAt"), 'YYYY-MM') AS month,
               SUM(amount)::numeric AS total
        FROM "Transaction"
        WHERE
            "userId" = ${userId}
            AND kind = 'expense'
            AND "occurredAt" >= ${fromDate}
            AND "occurredAt" < ${toDate}
        GROUP BY DATE_TRUNC('month', "occurredAt")
        ORDER BY DATE_TRUNC('month', "occurredAt") ASC;
    `;

    if (trendData.length === 0) {
        return {
            forecastText: "No expense data available to generate a forecast.",
            expectedChange: "N/A",
        };
    }

    // Format data for AI prompt
    const formattedTrendData = trendData.map((row) => ({
        month: row.month,
        total: Number(row.total),
    }));

    const prompt = `
You are an AI financial forecaster.
        Predict next month's expense trend based on this monthly expense history.

        Use only the provided data. Do not invent missing months or amounts.

Data:
        ${JSON.stringify(formattedTrendData)}
`;

    return generateStructuredWithGemini({
        prompt,
        schema: aiForecastSchema,
        responseSchema: aiForecastResponseSchema,
        systemInstruction:
            "Return a concise financial forecast as structured JSON only.",
    });
};
