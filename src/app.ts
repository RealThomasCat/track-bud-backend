import type { Request, Response, NextFunction } from "express";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";

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

// Routes
app.use("/", routes);

// Health Check Route
app.get("/", (_req: Request, res: Response) => {
    res.send("Expense Tracker API running...");
});

// 404 Handler (optional but clean)
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// Global Error Handler (must be last)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    errorHandler(err, req, res, next);
});

export default app;
