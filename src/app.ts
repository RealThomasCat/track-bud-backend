import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes"; // Single entry for all feature routes
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// Routes
app.use("/", routes);

// Health check
app.get("/", (_, res) => res.send("Expense Tracker API running..."));

// Global error handler — must be the last middleware
app.use(errorHandler);

export default app;
