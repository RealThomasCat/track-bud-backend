// Reusable Redis cache helpers.
// These helpers keep Redis details out of service files.
// Services should only think in terms of:
// - get cached data
// - save cached data
// - delete stale cached data

import { redisClient } from "../config/redis";
import { env } from "../config/env";

// getCache returns the cached value for a given key, or null if not found or on error.
export const getCache = async <T>(key: string): Promise<T | null> => {
    // If cache is disabled or Redis is not ready, we skip trying to get from cache.
    if (!env.cacheEnabled || !redisClient.isReady) {
        return null;
    }

    try {
        // Get the cached value from Redis by key. This returns a string or null if not found.
        const cachedValue = await redisClient.get(key);

        if (!cachedValue) {
            return null;
        }

        // Redis stores strings, so JSON.parse converts it back into the object/array shape our service expects.
        return JSON.parse(cachedValue) as T;
    } catch (error) {
        // Cache failure should not break the API.
        // If Redis fails, we return null so the service can use PostgreSQL.
        console.error("Redis getCache error:", error);
        return null;
    }
};

// setCache saves a value in Redis with a given key and TTL (time to live).
export const setCache = async (
    key: string,
    value: unknown,
    ttlSeconds: number,
): Promise<void> => {
    if (!env.cacheEnabled || !redisClient.isReady) {
        return;
    }

    try {
        // EX means expiry in seconds. After ttlSeconds, Redis automatically deletes this key.
        await redisClient.set(key, JSON.stringify(value), {
            EX: ttlSeconds,
        });
    } catch (error) {
        // Do not fail the request if Redis write fails.
        // The real response has already come from PostgreSQL/Gemini.
        console.error("Redis setCache error:", error);
    }
};

// deleteCache removes a specific key from Redis.
export const deleteCache = async (key: string): Promise<void> => {
    if (!env.cacheEnabled || !redisClient.isReady) {
        return;
    }

    try {
        await redisClient.del(key);
    } catch (error) {
        console.error("Redis deleteCache error:", error);
    }
};

// deleteCacheByPattern removes all keys that match a given pattern.
// Pattern can include wildcards, e.g. "dashboard:*:user:12:*" to match all dashboard cache keys for user 12.
// Like "dashboard:summary:user:12:start:2026-05-01:end:2026-05-31" and "dashboard:charts:user:12:start:2026-05-01:end:2026-05-31"
export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
    if (!env.cacheEnabled || !redisClient.isReady) {
        return;
    }

    try {
        // scanIterator is safer than KEYS for production-like usage because it iterates in batches and doesn't block Redis.
        // KEYS can block Redis if there are many keys.
        for await (const key of redisClient.scanIterator({
            MATCH: pattern,
            COUNT: 100, // Batch size for scanning.
        })) {
            await redisClient.del(key);
        }
    } catch (error) {
        console.error("Redis deleteCacheByPattern error:", error);
    }
};
