import { z } from "zod";

export const aiInsightSchema = z.object({
    summary: z.string().min(1),
    insights: z.array(z.string()).max(5),
});

export const aiSavingRecommendationsSchema = z.object({
    summary: z.string().min(1),
    tips: z.array(z.string()).max(5),
});

export const aiForecastSchema = z.object({
    forecastText: z.string().min(1),
    expectedChange: z.string().min(1),
});

export const aiInsightResponseSchema = {
    type: "object",
    properties: {
        summary: { type: "string" },
        insights: {
            type: "array",
            items: { type: "string" },
        },
    },
    required: ["summary", "insights"],
};

export const aiSavingRecommendationsResponseSchema = {
    type: "object",
    properties: {
        summary: { type: "string" },
        tips: {
            type: "array",
            items: { type: "string" },
        },
    },
    required: ["summary", "tips"],
};

export const aiForecastResponseSchema = {
    type: "object",
    properties: {
        forecastText: { type: "string" },
        expectedChange: { type: "string" },
    },
    required: ["forecastText", "expectedChange"],
};

export type AIInsightOutput = z.infer<typeof aiInsightSchema>;
export type AISavingRecommendationsOutput = z.infer<
    typeof aiSavingRecommendationsSchema
>;
export type AIForecastOutput = z.infer<typeof aiForecastSchema>;
