// It’s a centralized middleware in Express that:
// Catches any errors thrown by routes, services, or async logic
// Prevents you from writing repetitive try/catch blocks everywhere
// Returns consistent JSON error responses

import { Prisma } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

// Global error-handling middleware
export const errorHandler = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    console.error("Error:", err);

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: err.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    // Handle known Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            // Handle unique constraint violation (e.g., duplicate email)
            case "P2002": {
                const target = Array.isArray(err.meta?.target)
                    ? err.meta.target.join(",")
                    : "";

                const message = target.includes("email")
                    ? "Email already registered"
                    : "Resource already exists";

                return res.status(409).json({
                    success: false,
                    message,
                });
            }

            // Handle record not found (e.g., trying to update/delete non-existent record)
            case "P2025":
                return res.status(404).json({
                    success: false,
                    message: "Resource not found",
                });

            // Add more Prisma error code handling as needed

            // For unhandled Prisma errors, return a generic 400 response
            default:
                return res.status(400).json({
                    success: false,
                    message: "Database request failed",
                });
        }
    }

    // Handle custom AppError instances
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // For all other errors, return a generic 500 response
    res.status(500).json({
        success: false,
        message:
            env.nodeEnv === "production"
                ? "Internal server error"
                : err instanceof Error
                  ? err.message
                  : "Internal server error",
        stack:
            env.nodeEnv === "development" && err instanceof Error
                ? err.stack
                : undefined,
    });
};
