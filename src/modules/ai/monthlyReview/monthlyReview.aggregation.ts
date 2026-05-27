import { DataQualityLevel, MonthlyReview, Prisma } from "@prisma/client";
import { prisma } from "../../../config/db";
import { MonthlyReviewAIOutput } from "./monthlyReview.output";

type CategoryTotal = {
    category: string;
    total: number;
    percentOfExpenses: number;
};

type CategoryChange = {
    category: string;
    currentTotal: number;
    previousTotal: number;
    changePercent: number | null;
};

type PeriodMetrics = {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number | null;
    expenseToIncomeRatio: number | null;
    transactionCount: number;
    topExpenseCategories: CategoryTotal[];
};

export type MonthlyReviewAggregation = {
    current: PeriodMetrics;
    comparison: PeriodMetrics;
    incomeChangePercent: number | null;
    expenseChangePercent: number | null;
    savingsChangePercent: number | null;
    unusualCategoryIncreases: CategoryChange[];
    largestCategoryConcentration: CategoryTotal | null;
    dataQualityLevel: DataQualityLevel;
    hasEnoughData: boolean;
};

const roundMoney = (value: number): number => Number(value.toFixed(2));

const roundPercent = (value: number): number => Number(value.toFixed(2));

// Calculates financial health score and label based on aggregation data.
const getFinancialHealthScore = (
    aggregation: MonthlyReviewAggregation,
): { score: number; label: "LOW" | "FAIR" | "GOOD" | "STRONG" } => {
    const { current } = aggregation;

    const score =
        current.totalIncome <= 0
            ? 40
            : Math.max(
                  0,
                  Math.min(
                      100,
                      Math.round(100 - (current.expenseToIncomeRatio ?? 100)),
                  ),
              );

    const label =
        current.savingsRate === null
            ? "FAIR"
            : current.savingsRate >= 30
              ? "STRONG"
              : current.savingsRate >= 15
                ? "GOOD"
                : current.savingsRate >= 0
                  ? "FAIR"
                  : "LOW";

    return { score, label };
};

// Calculates percentage-based ratios like savings rate or expense-to-income ratio.
const calculateRate = (
    numerator: number,
    denominator: number,
): number | null => {
    if (denominator <= 0) {
        return null;
    }

    return roundPercent((numerator / denominator) * 100);
};

// Calculates month-over-month percentage change.
const calculatePercentChange = (
    current: number,
    previous: number,
): number | null => {
    if (previous <= 0) {
        return null;
    }

    return roundPercent(((current - previous) / previous) * 100);
};

// Builds the common transaction date filter used by all monthly review aggregation queries.
const buildTransactionWhere = (
    userId: number,
    startDate: Date,
    endDate: Date,
): Prisma.TransactionWhereInput => ({
    userId,
    occurredAt: {
        gte: startDate,
        lt: endDate,
    },
});

// Groups expense transactions by category and returns the largest categories with percentages.
const getCategoryTotals = async (
    userId: number,
    startDate: Date,
    endDate: Date,
): Promise<CategoryTotal[]> => {
    const categoryGroups = await prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
            ...buildTransactionWhere(userId, startDate, endDate),
            kind: "expense",
        },
        _sum: { amount: true },
        orderBy: {
            _sum: {
                amount: "desc",
            },
        },
    });

    const categoryIds = categoryGroups.map((item) => item.categoryId);

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

    const totalExpenses = categoryGroups.reduce(
        (sum, item) => sum + Number(item._sum.amount ?? 0),
        0,
    );

    return categoryGroups.map((item) => {
        const total = roundMoney(Number(item._sum.amount ?? 0));

        return {
            category: categoryNameById.get(item.categoryId) ?? "Unknown",
            total,
            percentOfExpenses:
                totalExpenses > 0
                    ? roundPercent((total / totalExpenses) * 100)
                    : 0,
        };
    });
};

// Calculates all deterministic metrics for one period: income, expenses, savings, count, and top categories.
// This function is used for both the review month and the previous comparison month.
const getPeriodMetrics = async (
    userId: number,
    startDate: Date,
    endDate: Date,
): Promise<PeriodMetrics> => {
    const where = buildTransactionWhere(userId, startDate, endDate);

    const [income, expense, transactionCount, topExpenseCategories] =
        await Promise.all([
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { ...where, kind: "income" },
            }),
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { ...where, kind: "expense" },
            }),
            prisma.transaction.count({ where }),
            getCategoryTotals(userId, startDate, endDate),
        ]);

    const totalIncome = roundMoney(Number(income._sum.amount ?? 0));
    const totalExpense = roundMoney(Number(expense._sum.amount ?? 0));
    const netSavings = roundMoney(totalIncome - totalExpense);

    return {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate: calculateRate(netSavings, totalIncome),
        expenseToIncomeRatio: calculateRate(totalExpense, totalIncome),
        transactionCount,
        topExpenseCategories: topExpenseCategories.slice(0, 5),
    };
};

// Converts transaction coverage into a simple confidence level for the generated review.
// Higher quality means the review has enough activity to support stronger interpretation.
const getDataQualityLevel = (
    transactionCount: number,
    totalIncome: number,
    totalExpense: number,
): DataQualityLevel => {
    if (transactionCount < 5 || totalIncome <= 0 || totalExpense <= 0) {
        return DataQualityLevel.LOW;
    }

    if (transactionCount >= 20 && totalIncome > 0 && totalExpense > 0) {
        return DataQualityLevel.HIGH;
    }

    if (transactionCount >= 8) {
        return DataQualityLevel.MEDIUM;
    }

    return DataQualityLevel.LOW;
};

// Applies the v1 minimum-data rule.
// If this returns false, the worker marks the review INSUFFICIENT_DATA and does not call Gemini later.
const hasEnoughMonthlyReviewData = (
    transactionCount: number,
    totalIncome: number,
    totalExpense: number,
): boolean => {
    return transactionCount >= 5 && totalIncome > 0 && totalExpense > 0;
};

// Finds categories that increased sharply compared to the previous month.
const getUnusualCategoryIncreases = (
    currentCategories: CategoryTotal[],
    comparisonCategories: CategoryTotal[],
): CategoryChange[] => {
    return currentCategories
        .map((currentCategory) => {
            const previousCategory = comparisonCategories.find(
                (category) => category.category === currentCategory.category,
            );

            const previousTotal = previousCategory?.total ?? 0;
            const changePercent = calculatePercentChange(
                currentCategory.total,
                previousTotal,
            );

            return {
                category: currentCategory.category,
                currentTotal: currentCategory.total,
                previousTotal,
                changePercent,
            };
        })
        .filter(
            (item) =>
                item.previousTotal > 0 &&
                item.changePercent !== null &&
                item.changePercent >= 50,
        )
        .slice(0, 3);
};

// Main aggregation entrypoint used by the worker.
// It produces a compact, token-efficient summary that can be sent to Gemini safely.
export const aggregateMonthlyReviewData = async (
    review: MonthlyReview,
): Promise<MonthlyReviewAggregation> => {
    // Run current-month metrics and comparison-month metrics in parallel.
    // Wait until both finish. Store first result in current. Store second result in comparison.
    const [current, comparison] = await Promise.all([
        getPeriodMetrics(review.userId, review.periodStart, review.periodEnd),
        // If comparisonStart and comparisonEnd exist, calculate comparison metrics from DB.
        // Else use a default empty comparison object.
        review.comparisonStart && review.comparisonEnd
            ? getPeriodMetrics(
                  review.userId,
                  review.comparisonStart,
                  review.comparisonEnd,
              )
            : Promise.resolve({
                  totalIncome: 0,
                  totalExpense: 0,
                  netSavings: 0,
                  savingsRate: null,
                  expenseToIncomeRatio: null,
                  transactionCount: 0,
                  topExpenseCategories: [],
              }),
    ]);

    return {
        current,
        comparison,
        incomeChangePercent: calculatePercentChange(
            current.totalIncome,
            comparison.totalIncome,
        ),
        expenseChangePercent: calculatePercentChange(
            current.totalExpense,
            comparison.totalExpense,
        ),
        savingsChangePercent: calculatePercentChange(
            current.netSavings,
            comparison.netSavings,
        ),
        unusualCategoryIncreases: getUnusualCategoryIncreases(
            current.topExpenseCategories,
            comparison.topExpenseCategories,
        ),
        largestCategoryConcentration:
            current.topExpenseCategories.length > 0
                ? (current.topExpenseCategories[0] ?? null)
                : null,
        dataQualityLevel: getDataQualityLevel(
            current.transactionCount,
            current.totalIncome,
            current.totalExpense,
        ),
        hasEnoughData: hasEnoughMonthlyReviewData(
            current.transactionCount,
            current.totalIncome,
            current.totalExpense,
        ),
    };
};

// Builds the final persisted report by combining deterministic backend metrics with Gemini interpretation.
// The AI output supplies narrative text only; all numbers and limits remain backend-computed.
export const buildAIMonthlyReviewResult = (
    aggregation: MonthlyReviewAggregation,
    aiOutput: MonthlyReviewAIOutput,
) => {
    const { current } = aggregation;
    const financialHealthScore = getFinancialHealthScore(aggregation);

    return {
        executiveSummary: aiOutput.executiveSummary,
        financialHealthScore: {
            score: financialHealthScore.score,
            label: financialHealthScore.label,
            reasons: aiOutput.financialHealthReasons,
        },
        keyMetrics: {
            totalIncome: current.totalIncome,
            totalExpense: current.totalExpense,
            netSavings: current.netSavings,
            savingsRate: current.savingsRate,
            expenseToIncomeRatio: current.expenseToIncomeRatio,
            transactionCount: current.transactionCount,
        },
        comparison: {
            incomeChangePercent: aggregation.incomeChangePercent,
            expenseChangePercent: aggregation.expenseChangePercent,
            savingsChangePercent: aggregation.savingsChangePercent,
            summary: aiOutput.comparisonSummary,
        },
        spendingBehaviorPatterns: aiOutput.spendingBehaviorPatterns,
        unusualSpendingOrRiskSignals: aiOutput.unusualSpendingOrRiskSignals,
        savingsQuality: aiOutput.savingsQuality,
        suggestedBudgetTargets: current.topExpenseCategories.map((category) => {
            const aiReason = aiOutput.suggestedBudgetTargetReasons.find(
                (item) => item.category === category.category,
            );

            return {
                category: category.category,
                suggestedLimit: roundMoney(category.total * 0.9),
                reason:
                    aiReason?.reason ??
                    "Suggested target is 10% lower than current spending.",
            };
        }),
        nextMonthActionPlan: aiOutput.nextMonthActionPlan,
    };
};

// Builds a stored result for valid insufficient-data cases.
// This is a product state, not a worker failure, so errorMessage remains null.
export const buildInsufficientDataResult = (
    aggregation: MonthlyReviewAggregation,
) => ({
    reason: "INSUFFICIENT_DATA",
    message:
        "Not enough transaction activity was found to generate a useful monthly review.",
    minimumRule:
        "At least 5 transactions with both income and expense activity.",
    keyMetrics: {
        totalIncome: aggregation.current.totalIncome,
        totalExpense: aggregation.current.totalExpense,
        transactionCount: aggregation.current.transactionCount,
    },
});
