// Central Redis client configuration.
// Redis is used as a fast in-memory cache.
// PostgreSQL remains the source of truth. If Redis is down,
// the app should still work, only slower.

import { createClient } from "redis";
import { env } from "./env";

// Create a single Redis client instance that can be shared across the app.
export const redisClient = createClient({
    url: env.redisUrl,
});

// Redis client emits events for connection status and errors.
redisClient.on("error", (error) => {
    console.error("Redis error:", error);
});

redisClient.on("connect", () => {
    console.log("Redis connected");
});

redisClient.on("ready", () => {
    console.log("Redis ready");
});

// Connect Redis once during app startup.
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

    // Connect to Redis server. This will trigger the "connect" and "ready" events.
    await redisClient.connect();
};
