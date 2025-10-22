import { prisma } from "../../config/db";
import { generateWithGemini } from "../../config/gemini";
import type { AIDashboardInput } from "./ai.validation";
import { TransactionKind } from "@prisma/client"; //Import enum from Prisma client

// Utility: builds date filter dynamically
function buildDateFilter(data: AIDashboardInput) {
    const { startDate, endDate } = data.query || {};
    return startDate && endDate
        ? { occurredAt: { gte: new Date(startDate), lte: new Date(endDate) } }
        : {};
}

// --- SPENDING SUMMARY ---
export const getSpendingSummaryService = async (
    userId: number,
    data: AIDashboardInput
) => {
    const where = {
        userId,
        kind: TransactionKind.expense,
        ...buildDateFilter(data),
    } as const;

    // Group by category to get spending per category
    const spendingData = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where,
    });

    // Prepare concise dataset for AI
    const formattedData = spendingData.map((s) => ({
        categoryId: s.categoryId,
        total: Number(s._sum.amount || 0),
    }));

    // Handle case with no spending data
    if (formattedData.length === 0) {
        return JSON.stringify({
            summary: "No expenses recorded for this period.",
            insights: [],
        });
    }

    // Compose prompt for Gemini API
    const prompt = `
You are a personal finance assistant.
Summarize this user's spending in 3–5 short insights for dashboard display.

Return your answer as valid JSON with keys:
{
  "summary": string,
  "insights": string[]
}

Data:
${JSON.stringify(formattedData)}
`;

    const aiResponse = await generateWithGemini(prompt);
    return aiResponse;
};

// --- SAVING RECOMMENDATIONS ---
export const getSavingRecommendationsService = async (
    userId: number,
    data: AIDashboardInput
) => {
    const where = {
        userId,
        kind: TransactionKind.expense,
        ...buildDateFilter(data),
    } as const;

    const spendingData = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where,
    });

    const formattedData = spendingData.map((s) => ({
        categoryId: s.categoryId,
        total: Number(s._sum.amount || 0),
    }));

    if (formattedData.length === 0) {
        return JSON.stringify({
            summary: "No expenses recorded for this period.",
            insights: [],
        });
    }

    const prompt = `
You are a financial advisor.
Given the user's spending data, suggest 3 personalized saving tips.

Return your answer as valid JSON with keys:
{
  "tips": string[]
}

Data:
${JSON.stringify(formattedData)}
`;

    const aiResponse = await generateWithGemini(prompt);
    return aiResponse;
};

// --- FORECAST ---
export const getForecastService = async (
    userId: number,
    data: AIDashboardInput
) => {
    // Fetch total monthly expenses for the last 6 months
    const trendData = await prisma.$queryRaw<
        { month: string; total: number }[]
    >`
        SELECT TO_CHAR(DATE_TRUNC('month', "occurredAt"), 'YYYY-MM') AS month,
               SUM(amount)::numeric AS total
        FROM "Transaction"
        WHERE "userId" = ${userId} AND kind = 'expense'
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 6;
    `;

    if (trendData.length === 0) {
        return JSON.stringify({
            forecastText: "No expense data available to generate a forecast.",
            expectedChange: "N/A",
        });
    }

    const prompt = `
You are an AI financial forecaster.
Predict next month's expense trend based on this 6-month history.

Return your answer as valid JSON with keys:
{
  "forecastText": string,
  "expectedChange": string
}

Data:
${JSON.stringify(trendData)}
`;

    const aiResponse = await generateWithGemini(prompt);
    return aiResponse;
};
