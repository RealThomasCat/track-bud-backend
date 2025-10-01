import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import prisma from "./config/db";

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Health check route
app.get("/", (req, res) => res.send("Expense Tracker API running..."));

// Test DB connection
app.get("/db-test", async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "DB connection failed" });
    }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
