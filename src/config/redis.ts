// Central Redis client configuration.
// Redis is used as a fast in-memory cache.
// PostgreSQL remains the source of truth. If Redis is down,
// the app should still work, only slower.

import { createClient } from "redis";
import { env } from "./env";

let hasLoggedRedisError = false;

// Create a single Redis client instance that can be shared across the app.
export const redisClient = createClient({
    url: env.redisUrl,
    socket: {
        // Custom limited reconnect retries behavior
        reconnectStrategy: (retries) => {
            // During startup/local development, avoid endless noisy retries.
            if (retries > 3) {
                return new Error("Redis reconnect attempts exceeded");
            }

            // Wait 500ms before the next reconnect attempt.
            return 500;
        },
    },
});

// Redis client emits events for connection status and errors.
redisClient.on("error", (error) => {
    if (hasLoggedRedisError) {
        return;
    }

    hasLoggedRedisError = true;

    console.error(
        "Redis connection error:",
        error instanceof Error && error.message
            ? error.message
            : "Unable to connect to Redis",
    );
});

redisClient.on("connect", () => {
    console.log("Redis connected");
});

redisClient.on("ready", () => {
    hasLoggedRedisError = false;
    console.log("Redis ready");
});

// Function to connect Redis once during app startup.
// We keep this separate instead of auto-connecting on import,
// because startup order should be explicit and easy to debug.
export const connectRedis = async (): Promise<void> => {
    // If cache is disabled, we don't need to connect at all.
    if (!env.cacheEnabled) {
        console.log("Redis cache disabled");
        return;
    }

    // If Redis is already connected, we can skip connecting again.
    if (redisClient.isOpen) {
        return;
    }

    try {
        // Connect to Redis server. This will trigger the "connect" and "ready" events.
        await redisClient.connect();
    } catch (error) {
        console.error("Redis unavailable. Continuing without cache.");

        // Do not throw because Redis is only a cache layer. PostgreSQL remains the source of truth.
    }
};

// Function to disconnect from redis server.
export const disconnectRedis = async (): Promise<void> => {
    if (!redisClient.isOpen) {
        return;
    }

    await redisClient.quit();
};
