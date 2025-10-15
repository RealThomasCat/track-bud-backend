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

export type DashboardSummaryInput = z.infer<typeof dashboardSummarySchema>;
export type DashboardChartsInput = z.infer<typeof dashboardChartsSchema>;
