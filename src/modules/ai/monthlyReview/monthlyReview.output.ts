import { z } from "zod";

export const monthlyReviewAISchema = z.object({
    executiveSummary: z.string().min(1),
    financialHealthReasons: z.array(z.string().min(1)).min(1).max(4),
    comparisonSummary: z.string().min(1),
    spendingBehaviorPatterns: z.array(z.string().min(1)).max(5),
    unusualSpendingOrRiskSignals: z.array(z.string().min(1)).max(5),
    savingsQuality: z.object({
        summary: z.string().min(1),
        rating: z.enum(["LOW", "MEDIUM", "HIGH"]),
    }),
    suggestedBudgetTargetReasons: z
        .array(
            z.object({
                category: z.string().min(1),
                reason: z.string().min(1),
            }),
        )
        .max(5),
    nextMonthActionPlan: z.array(z.string().min(1)).min(3).max(5),
});

export const monthlyReviewAIResponseSchema = {
    type: "object",
    properties: {
        executiveSummary: { type: "string" },
        financialHealthReasons: {
            type: "array",
            items: { type: "string" },
        },
        comparisonSummary: { type: "string" },
        spendingBehaviorPatterns: {
            type: "array",
            items: { type: "string" },
        },
        unusualSpendingOrRiskSignals: {
            type: "array",
            items: { type: "string" },
        },
        savingsQuality: {
            type: "object",
            properties: {
                summary: { type: "string" },
                rating: {
                    type: "string",
                    enum: ["LOW", "MEDIUM", "HIGH"],
                },
            },
            required: ["summary", "rating"],
        },
        suggestedBudgetTargetReasons: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    category: { type: "string" },
                    reason: { type: "string" },
                },
                required: ["category", "reason"],
            },
        },
        nextMonthActionPlan: {
            type: "array",
            items: { type: "string" },
        },
    },
    required: [
        "executiveSummary",
        "financialHealthReasons",
        "comparisonSummary",
        "spendingBehaviorPatterns",
        "unusualSpendingOrRiskSignals",
        "savingsQuality",
        "suggestedBudgetTargetReasons",
        "nextMonthActionPlan",
    ],
};

export type MonthlyReviewAIOutput = z.infer<typeof monthlyReviewAISchema>;
