import { generateStructuredWithGemini } from "../../../config/gemini";
import { MonthlyReviewAggregation } from "./monthlyReview.aggregation";
import {
    monthlyReviewAIResponseSchema,
    monthlyReviewAISchema,
} from "./monthlyReview.output";

const buildSuggestedBudgetInputs = (aggregation: MonthlyReviewAggregation) => {
    return aggregation.current.topExpenseCategories.map((category) => ({
        category: category.category,
        currentTotal: category.total,
        suggestedLimit: Number((category.total * 0.9).toFixed(2)),
    }));
};

// Builds the compact payload sent to Gemini.
// It excludes raw transactions and transaction notes to keep token usage low and protect user privacy.
const buildMonthlyReviewPromptData = (
    aggregation: MonthlyReviewAggregation,
) => {
    return {
        dataQualityLevel: aggregation.dataQualityLevel,
        currentMonth: {
            totalIncome: aggregation.current.totalIncome,
            totalExpense: aggregation.current.totalExpense,
            netSavings: aggregation.current.netSavings,
            savingsRate: aggregation.current.savingsRate,
            expenseToIncomeRatio: aggregation.current.expenseToIncomeRatio,
            transactionCount: aggregation.current.transactionCount,
            topExpenseCategories: aggregation.current.topExpenseCategories,
        },
        previousMonth: {
            totalIncome: aggregation.comparison.totalIncome,
            totalExpense: aggregation.comparison.totalExpense,
            netSavings: aggregation.comparison.netSavings,
            transactionCount: aggregation.comparison.transactionCount,
        },
        monthOverMonthChange: {
            incomeChangePercent: aggregation.incomeChangePercent,
            expenseChangePercent: aggregation.expenseChangePercent,
            savingsChangePercent: aggregation.savingsChangePercent,
        },
        riskSignals: {
            unusualCategoryIncreases: aggregation.unusualCategoryIncreases,
            largestCategoryConcentration:
                aggregation.largestCategoryConcentration,
        },
        suggestedBudgetInputs: buildSuggestedBudgetInputs(aggregation),
    };
};

// Generate monthly review AI output using Gemini.
export const generateMonthlyReviewAIOutput = async (
    aggregation: MonthlyReviewAggregation,
) => {
    const promptData = buildMonthlyReviewPromptData(aggregation);

    const prompt = `
        You are a personal finance assistant writing a monthly review for a budgeting app.

        Use only the provided aggregated data.
        Do not invent amounts, categories, transaction counts, or percentages.
        Do not mention raw transactions or notes.
        If dataQualityLevel is LOW, avoid overconfident language.
        Keep the response practical, concise, and action-oriented.

        Backend-computed data:
        ${JSON.stringify(promptData)}
    `;

    return generateStructuredWithGemini({
        prompt,
        schema: monthlyReviewAISchema,
        responseSchema: monthlyReviewAIResponseSchema,
        systemInstruction:
            "Return only structured JSON for a monthly financial behavior review. Interpret the backend-computed metrics without inventing new numbers.",
        maxOutputTokens: 1200,
    });
};
