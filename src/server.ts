// This file is the entry point of the server application.
// It imports the Express app, connects external services, and starts listening on a specified port.

import app from "./app";
import { prisma } from "./config/db";
import { connectRedis, disconnectRedis } from "./config/redis";

// Render always provides process.env.PORT at runtime, so we read it directly here instead of from env.ts
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// Store the HTTP server instance returned from app.listen().
// We need this later so we can stop accepting new requests during shutdown.
let server: ReturnType<typeof app.listen> | null = null;

// Prevent running shutdown logic multiple times if multiple signals arrive.
let isShuttingDown = false;

// Close external services safely.
const closeExternalConnections = async (): Promise<void> => {
    await prisma.$disconnect();
    console.log("PostgreSQL disconnected");

    await disconnectRedis();
    console.log("Redis disconnected");
};

// Gracefully shuts down the server and external connections.
const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    console.log(`${signal} received. Shutting down gracefully...`);

    // If the HTTP server was never started, just close external connections.
    if (!server) {
        try {
            await closeExternalConnections();
            process.exit(0);
        } catch (error) {
            console.error("Error during shutdown before server start:", error);
            process.exit(1);
        }
    }

    // Stop accepting new requests. Existing requests are allowed to finish.
    server.close(async (error?: Error) => {
        if (error) {
            console.error("Error while closing HTTP server:", error);
            process.exit(1);
        }

        try {
            await closeExternalConnections();
            process.exit(0);
        } catch (shutdownError) {
            console.error("Error during graceful shutdown:", shutdownError);
            process.exit(1);
        }
    });
};

// Starts the server
const startServer = async (): Promise<void> => {
    try {
        // Before we were using Prisma's lazy connection (prisma.$connect() is called automatically on first query).
        // Now we call prisma.$connect() explicitly at startup for production.
        // This way, if the database connection fails, we get immediate visibility and the server doesn't start in a broken state.
        await prisma.$connect();
        console.log("PostgreSQL connected");

        // If shutdown has begun for some reason, return
        if (isShuttingDown) {
            return;
        }

        // Connect Redis before accepting requests.
        // If Redis fails and cache is enabled, we want startup visibility.
        await connectRedis();

        if (isShuttingDown) {
            return;
        }

        // Store the server instance so gracefulShutdown can close it later.
        server = app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);

        try {
            await closeExternalConnections();
        } catch (disconnectError) {
            console.error(
                "Error while cleaning up after startup failure:",
                disconnectError,
            );
        }

        process.exit(1);
    }
};

process.on("SIGINT", () => {
    void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void gracefulShutdown("SIGTERM");
});

void startServer();
