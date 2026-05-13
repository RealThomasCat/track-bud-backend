// This file defines the main Express application setup.

import type { Request, Response, NextFunction } from "express";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";
import { prisma } from "./config/db";
import { globalApiLimiter } from "./middleware/rateLimitMiddleware";

const app = express();

// Trust the first reverse proxy in production.
// Needed when the app is deployed behind Render/Nginx/Cloudflare/etc.
// This helps Express read the real client IP from X-Forwarded-For, which is important for IP-based rate limiting.
if (env.nodeEnv === "production") {
    app.set("trust proxy", 1);
}

// Core Middlewares
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
    }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(cookieParser());

// CORS
app.use(
    cors({
        origin: env.frontendUrl,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

// DB TEST ROUTE (Restricted DB test to development only)
if (process.env.NODE_ENV !== "production") {
    app.get("/db-test", async (_req, res) => {
        const users = await prisma.user.findMany();
        res.json(users);
    });
}

// Routes
// Apply global API rate limiter to all /api/v1 routes. This should be the first middleware for API routes to catch abusive traffic early.
app.use("/api/v1", globalApiLimiter, routes);

// Health Check
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    errorHandler(err, req, res, next);
});

export default app;
