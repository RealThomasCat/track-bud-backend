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

const app = express();

// Core Middlewares
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// CORS
app.use(
    cors({
        origin: env.frontendUrl,
        credentials: true,
    })
);

// DB TEST ROUTE
app.get("/db-test", async (_req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        console.error("DB test failed:", error);
        res.status(500).json({ error: "DB connection failed" });
    }
});

// Routes
app.use("/", routes);

// Health Check
app.get("/", (_req: Request, res: Response) => {
    res.send("Expense Tracker API running...");
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
