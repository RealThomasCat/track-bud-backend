// This file is the entry point of the server application. It imports the Express app and starts listening on a specified port.

import app from "./app";
import { prisma } from "./config/db";
import { connectRedis } from "./config/redis";

// Render always provides process.env.PORT at runtime
// So we read it directly here instead of from env.ts
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// Start Server
const startServer = async () => {
    try {
        // Before we were using Prisma's lazy connection (prisma.$connect() is called automatically on first query).
        // Now we call prisma.$connect() explicitly at startup for production.
        // This way, if the database connection fails, we get immediate visibility and the server doesn't start in a broken state.
        await prisma.$connect();
        console.log("PostgreSQL connected");

        // Connect Redis before accepting requests.
        // If Redis fails and cache is enabled, we want startup visibility.
        await connectRedis();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
