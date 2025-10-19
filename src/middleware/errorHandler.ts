// It’s a centralized middleware in Express that:
// Catches any errors thrown by routes, services, or async logic
// Prevents you from writing repetitive try/catch blocks everywhere
// Returns consistent JSON error responses

import { Request, Response, NextFunction } from "express";
// import { env } from "../config/env";

// Global error-handling middleware
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error("Error:", err);

    // Handle known errors (like validation or auth)
    const statusCode = err.statusCode || 500;
    const message =
        err.message || "Internal server error. Please try again later.";

    res.status(statusCode).json({
        success: false,
        message,
        // Optional for debugging during dev only:
        // stack: env.nodeEnv === "development" ? err.stack : undefined,
    });
};
