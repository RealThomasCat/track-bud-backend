import { z } from "zod";
import {
    dashboardLimitSchema,
    dateRangeQuerySchema,
    rawDateRangeQuerySchema,
    toExclusiveUtcDayAfter,
    toUtcDayStart,
} from "../../utils/validation";

// Summary just supports optional date range filters (for future use)
export const dashboardSummaryQuerySchema = dateRangeQuerySchema;

// Charts schema allows specifying a date range
export const dashboardChartsQuerySchema = dateRangeQuerySchema;

// Top Categories schema supports partial date range filtering and small capped limit
export const dashboardTopCategoriesQuerySchema = rawDateRangeQuerySchema
    .safeExtend({
        limit: dashboardLimitSchema,
    })
    .transform((data) => ({
        ...data,
        startDate: data.startDate ? toUtcDayStart(data.startDate) : undefined,
        endDate: data.endDate
            ? toExclusiveUtcDayAfter(data.endDate)
            : undefined,
    }));

// Recent Activity schema just supports a small capped limit for now.
export const dashboardRecentActivityQuerySchema = z.strictObject({
    limit: dashboardLimitSchema,
});

export type DashboardSummaryInput = z.infer<typeof dashboardSummaryQuerySchema>;
export type DashboardChartsInput = z.infer<typeof dashboardChartsQuerySchema>;
export type DashboardTopCategoriesInput = z.infer<
    typeof dashboardTopCategoriesQuerySchema
>;
export type DashboardRecentActivityInput = z.infer<
    typeof dashboardRecentActivityQuerySchema
>;
