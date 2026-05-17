// Centralized configuration file that:
// - Loads environment variables from .env.
// - Validates them at startup.
// - Exports typed config for the rest of the app.

import dotenv from "dotenv";
import { z } from "zod";
import type { StringValue } from "ms";

dotenv.config({ quiet: true });

// Validation schema
const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET must be at least 32 characters long"),

    JWT_EXPIRES_IN: z
        .string()
        .min(1, "JWT_EXPIRES_IN is required")
        .default("1h"),

    JWT_COOKIE_MAX_AGE_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(60 * 60 * 1000),

    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

    FRONTEND_URL: z.url().default("http://localhost:3000"),

    REDIS_URL: z.url().default("redis://localhost:6379"),

    CACHE_ENABLED: z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true"),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
    nodeEnv: parsedEnv.NODE_ENV,
    jwtSecret: parsedEnv.JWT_SECRET,
    jwtExpiresIn: parsedEnv.JWT_EXPIRES_IN as StringValue,
    jwtCookieMaxAgeMs: parsedEnv.JWT_COOKIE_MAX_AGE_MS,
    geminiApiKey: parsedEnv.GEMINI_API_KEY,
    frontendUrl: parsedEnv.FRONTEND_URL,
    redisUrl: parsedEnv.REDIS_URL,
    cacheEnabled: parsedEnv.CACHE_ENABLED,
};

// NOTE: No DatabaseUrl here because Prisma CLI commands (prisma generate, prisma migrate) automatically read it from .env.
