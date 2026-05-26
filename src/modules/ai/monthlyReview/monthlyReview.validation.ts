import { z } from "zod";
import { idSchema } from "../../../utils/validation";

// V1 monthly review generation does not accept request body options.
// Keeping this strict protects the API contract until we intentionally add options like regenerate later.
export const createMonthlyReviewSchema = z.strictObject({});

export const getMonthlyReviewByIdSchema = z.strictObject({
    id: idSchema,
});
