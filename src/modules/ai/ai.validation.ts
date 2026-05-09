import { z } from "zod";
import { dateRangeQuerySchema } from "../../utils/validation";

// Common schema for AI dashboard endpoints — supports optional date range filters
export const aiDashboardQuerySchema = dateRangeQuerySchema;

export type AIDashboardQueryInput = z.infer<typeof aiDashboardQuerySchema>;
