import { z } from "zod";

// Summary just supports optional date range filters (for future use)
export const dashboardSummarySchema = z.object({
    query: z
        .object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        })
        .optional(),
});

// Charts schema allows specifying a date range
export const dashboardChartsSchema = z.object({
    query: z
        .object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        })
        .optional(),
});

export const dashboardTopCategoriesSchema = z.object({
    query: z
        .object({
            limit: z
                .string()
                .transform((val) => parseInt(val, 10))
                .optional()
                .default(5),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        })
        .optional(),
});

export const dashboardRecentActivitySchema = z.object({
    query: z
        .object({
            limit: z
                .string()
                .transform((val) => parseInt(val, 10))
                .optional()
                .default(5),
        })
        .optional(),
});

export type DashboardSummaryInput = z.infer<typeof dashboardSummarySchema>;
export type DashboardChartsInput = z.infer<typeof dashboardChartsSchema>;
export type DashboardRecentActivityInput = z.infer<
    typeof dashboardRecentActivitySchema
>;
export type DashboardTopCategoriesInput = z.infer<
    typeof dashboardTopCategoriesSchema
>;
