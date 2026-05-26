// Producer-side file. Creates the queue and exposes enqueueMonthlyReviewJob()

import { Queue } from "bullmq";
import { bullMqConnection } from "../../config/bullmq";
import {
    MONTHLY_REVIEW_JOB_NAME,
    MONTHLY_REVIEW_QUEUE_NAME,
    MonthlyReviewJobData,
} from "../monthlyReview.job";

// Create producer-side queue object used by the API process to request monthly review generation.
export const monthlyReviewQueue = new Queue<MonthlyReviewJobData>(
    MONTHLY_REVIEW_QUEUE_NAME,
    {
        connection: bullMqConnection,
        defaultJobOptions: {
            // If the job fails, BullMQ can retry it up to 3 total attempts.
            attempts: 3,
            // Do not retry immediately. Wait first, then retry with increasing delay.
            backoff: {
                type: "exponential",
                delay: 5000,
            },
            // Keep at most 1000 completed jobs or jobs up to 24 hours old in redis.
            removeOnComplete: {
                age: 24 * 60 * 60,
                count: 1000,
            },
            // For failed jobs, keep more history.
            removeOnFail: {
                age: 7 * 24 * 60 * 60,
                count: 5000,
            },
        },
    },
);

// Helper used by the monthly review service to add job to queue after it creates a PostgreSQL review row.
export const enqueueMonthlyReviewJob = async (data: MonthlyReviewJobData) => {
    return monthlyReviewQueue.add(MONTHLY_REVIEW_JOB_NAME, data, {
        // Makes BullMQ enqueueing idempotent for a specific review row.
        // BullMQ job ids must not contain ":" because Redis keys use it as a separator.
        // PostgreSQL still remains the source of truth for review status.
        jobId: `monthly-review-${data.reviewId}`,
    });
};
