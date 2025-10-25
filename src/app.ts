import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";

const app = express();

// Core middlewares
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// CORS configuration
app.use(
    cors({
        origin: env.frontendUrl,
        credentials: true,
    })
);

// Routes
app.use("/", routes);

// Health check
app.get("/", (_, res) => res.send("Expense Tracker API running..."));

// Global error handler (must be last)
app.use(errorHandler);

export default app;
