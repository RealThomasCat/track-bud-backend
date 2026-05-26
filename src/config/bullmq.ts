// BullMQ-Redis connection config used/shared by queues and workers.
// NOTE: Config for queues and workers can also be separate.

import type { ConnectionOptions } from "bullmq";
import { env } from "./env";

// Parse redisUrl from env to dynamically get hostname, port, username, password and pathname
const redisUrl = new URL(env.redisUrl);

// Define connection options
export const bullMqConnection: ConnectionOptions = {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1)) || 0 : 0,

    // BullMQ workers should not give up on Redis commands too early during temporary Redis hiccups.
    // This is different from job retries, this is about the worker staying alive during Redis connection problems.
    maxRetriesPerRequest: null,
};
