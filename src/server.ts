import type { Request, Response } from "express";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";

const PORT = env.port || 5000;

// DB Test Route
app.get("/db-test", async (_req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        console.error("DB test failed:", error);
        res.status(500).json({ error: "DB connection failed" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
