// Dashboard cache configuration and cache key helpers.
// This file centralizes:
// - cache TTL values
// - Redis key generation
// - dashboard cache invalidation patterns
// Keeping cache keys centralized prevents accidental inconsistencies across services and invalidation logic.

// Time to live
export const DASHBOARD_SUMMARY_TTL_SECONDS = 60;
export const DASHBOARD_CHARTS_TTL_SECONDS = 120;

// Helper function to convert date object to string.
const formatCacheDate = (date?: Date): string => {
    return date ? date.toISOString() : "none";
};

// Generates Redis cache key for dashboard summary.
// Example: dashboard:summary:user:12:start:2026-05-01:end:2026-05-31
export const getDashboardSummaryCacheKey = (
    userId: number,
    startDate?: Date,
    endDate?: Date,
): string => {
    return `dashboard:summary:user:${userId}:start:${formatCacheDate(startDate)}:end:${formatCacheDate(endDate)}`;
};

// Generates Redis cache key for dashboard charts.
// Example: dashboard:charts:user:12:start:2026-05-01:end:2026-05-31
export const getDashboardChartsCacheKey = (
    userId: number,
    startDate?: Date,
    endDate?: Date,
): string => {
    return `dashboard:charts:user:${userId}:start:${formatCacheDate(startDate)}:end:${formatCacheDate(endDate)}`;
};

// Pattern used for deleting all dashboard cache belonging to a user after transaction changes.
// Example match: dashboard:*:user:12:*
export const getDashboardUserCachePattern = (userId: number): string => {
    return `dashboard:*:user:${userId}:*`;
};
