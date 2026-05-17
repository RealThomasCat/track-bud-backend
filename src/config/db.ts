import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
    // In development log prisma queries, errors and warnings, in production log only errors
    log:
        process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
});
