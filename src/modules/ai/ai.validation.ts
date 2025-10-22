import { z } from "zod";

// Common schema for AI dashboard endpoints — supports optional date range filters
export const aiDashboardSchema = z.object({
    query: z
        .object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        })
        .optional(),
});

export type AIDashboardInput = z.infer<typeof aiDashboardSchema>;
