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
    AIInsightOutput,
    AISavingRecommendationsOutput,
    AIForecastOutput,
} from "./ai.output";
import { AppError } from "../../utils/AppError";
import {
    AI_FORECAST_TTL_SECONDS,
    AI_SAVING_RECOMMENDATIONS_TTL_SECONDS,
    AI_SPENDING_SUMMARY_TTL_SECONDS,
    getAIForecastCacheKey,
    getAISavingRecommendationsCacheKey,
    getAISpendingSummaryCacheKey,
} from "./ai.cache";
import { getCache, setCache } from "../../utils/cache";

// TODO: Add db operations failure checks and throw AppError with proper messages and status codes.

// Utility to get default start date based on a number of days before today if client doesn't provide a startDate.
// This ensures we always have a valid limited date range for our queries.
const getDefaultStartDate = (days: number): Date => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date;
};

// Utility: builds date filter dynamically.
function buildDateFilter(data: AIDashboardQueryInput, defaultDays: number) {
    const endDate = data.endDate ?? new Date();
    const startDate = data.startDate ?? getDefaultStartDate(defaultDays);

    return {
        occurredAt: {
            gte: startDate,
            lt: endDate,
        },
    };
}

// --- SPENDING SUMMARY ---
export const getSpendingSummaryService = async (
    userId: number,
    data: AIDashboardQueryInput,
) => {
    // Build cache key
    const cacheKey = getAISpendingSummaryCacheKey(
        userId,
        data.startDate,
        data.endDate,
    );

    // First find summary in cache
    const cached = await getCache<AIInsightOutput>(cacheKey);

    if (cached) {
        return cached;
    }

    const where = {
        userId,
        kind: TransactionKind.expense,
        ...buildDateFilter(data, 30), // Default to last 30 days if no date range provided
    };

    // Group by category to get spending per category
    const spendingData = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where,
    });

    // If no spending data, set cache and return early with a default message and empty insights.
    if (spendingData.length === 0) {
        const result = {
            summary: "No expenses recorded for this period.",
            insights: [],
        };

        await setCache(cacheKey, result, AI_SPENDING_SUMMARY_TTL_SECONDS);

        return result;
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

    // Generate gemini result
    const result = await generateStructuredWithGemini({
        prompt,
        schema: aiInsightSchema,
        responseSchema: aiInsightResponseSchema,
        systemInstruction:
            "Return concise personal finance insights as structured JSON only.",
    });

    // Save fresh AI result to cache after Gemini generation
    await setCache(cacheKey, result, AI_SPENDING_SUMMARY_TTL_SECONDS);

    return result;
};

// --- SAVING RECOMMENDATIONS ---
export const getSavingRecommendationsService = async (
    userId: number,
    data: AIDashboardQueryInput,
) => {
    const cacheKey = getAISavingRecommendationsCacheKey(
        userId,
        data.startDate,
        data.endDate,
    );

    const cached = await getCache<AISavingRecommendationsOutput>(cacheKey);

    if (cached) {
        return cached;
    }

    const where = {
        userId,
        kind: TransactionKind.expense,
        ...buildDateFilter(data, 90), // Default to last 90 days if no date range provided
    };

    const spendingData = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where,
    });

    if (spendingData.length === 0) {
        const result = {
            summary: "No expenses recorded for this period.",
            tips: [],
        };

        await setCache(cacheKey, result, AI_SAVING_RECOMMENDATIONS_TTL_SECONDS);

        return result;
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

    const result = await generateStructuredWithGemini({
        prompt,
        schema: aiSavingRecommendationsSchema,
        responseSchema: aiSavingRecommendationsResponseSchema,
        systemInstruction:
            "Return concise personal finance saving recommendations as structured JSON only.",
    });

    await setCache(cacheKey, result, AI_SAVING_RECOMMENDATIONS_TTL_SECONDS);

    return result;
};

// --- FORECAST ---
export const getForecastService = async (
    userId: number,
    data: AIDashboardQueryInput,
) => {
    const cacheKey = getAIForecastCacheKey(
        userId,
        data.startDate,
        data.endDate,
    );

    const cached = await getCache<AIForecastOutput>(cacheKey);

    if (cached) {
        return cached;
    }

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
        const result = {
            forecastText: "No expense data available to generate a forecast.",
            expectedChange: "N/A",
        };

        await setCache(cacheKey, result, AI_FORECAST_TTL_SECONDS);

        return result;
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

    const result = await generateStructuredWithGemini({
        prompt,
        schema: aiForecastSchema,
        responseSchema: aiForecastResponseSchema,
        systemInstruction:
            "Return a concise financial forecast as structured JSON only.",
    });

    await setCache(cacheKey, result, AI_FORECAST_TTL_SECONDS);

    return result;
};
