import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";

const PORT = env.port || 5000;

// Optional DB test (you can remove later)
app.get("/db-test", async (_, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "DB connection failed" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
