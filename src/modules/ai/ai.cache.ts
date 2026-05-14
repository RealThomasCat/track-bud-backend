// AI cache configuration and key helpers.
//
// AI responses are good cache candidates because:
// - Gemini calls are slower than DB reads
// - AI calls may cost money
// - repeated dashboard visits often ask for the same insight again

import { deleteCacheByPattern } from "../../utils/cache";

const formatCacheDate = (date?: Date): string => {
    return date ? date.toISOString() : "none";
};

// Time to live
export const AI_SPENDING_SUMMARY_TTL_SECONDS = 15 * 60; // 15 minutes
export const AI_SAVING_RECOMMENDATIONS_TTL_SECONDS = 30 * 60; // 30 minutes
export const AI_FORECAST_TTL_SECONDS = 60 * 60; // 1 hour

export const getAISpendingSummaryCacheKey = (
    userId: number,
    startDate?: Date,
    endDate?: Date,
): string => {
    return `ai:spending-summary:user:${userId}:start:${formatCacheDate(startDate)}:end:${formatCacheDate(endDate)}`;
};

export const getAISavingRecommendationsCacheKey = (
    userId: number,
    startDate?: Date,
    endDate?: Date,
): string => {
    return `ai:saving-recommendations:user:${userId}:start:${formatCacheDate(startDate)}:end:${formatCacheDate(endDate)}`;
};

export const getAIForecastCacheKey = (
    userId: number,
    startDate?: Date,
    endDate?: Date,
): string => {
    return `ai:forecast:user:${userId}:start:${formatCacheDate(startDate)}:end:${formatCacheDate(endDate)}`;
};

export const getAIUserCachePattern = (userId: number): string => {
    return `ai:*:user:${userId}:*`;
};
