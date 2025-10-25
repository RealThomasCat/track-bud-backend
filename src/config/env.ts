// Centralized configuration file that:
// Loads all environment variables from your .env file (via dotenv).
// Exports them in a typed, clean, reusable format for the rest of your code.
// Prevents you from repeatedly calling process.env.VARIABLE_NAME all over the app.

import dotenv from "dotenv";
dotenv.config();

export const env = {
    port: Number(process.env.PORT) || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
    jwtSecret: process.env.JWT_SECRET || "",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};

if (!env.geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
}

// NOTE: No DatabaseUrl here because Prisma CLI commands (prisma generate, prisma migrate) automatically read it from .env.
