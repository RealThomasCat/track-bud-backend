// Consumer-side file. Creates worker and defines what to do when a monthly-review job is received.

import { Job, Worker } from "bullmq";
import { bullMqConnection } from "../../config/bullmq";
import {
    MONTHLY_REVIEW_QUEUE_NAME,
    MonthlyReviewJobData,
} from "../monthlyReview.job";

const formatWorkerError = (error: Error) => ({
    name: error.name,
    message: error.message || "No error message provided",
    stack: error.stack,
});

// Processes monthly review jobs from Redis.
// For now this only logs the job so we can test the async pipeline before adding DB aggregation or Gemini.
const processMonthlyReviewJob = async (job: Job<MonthlyReviewJobData>) => {
    console.log("Monthly review job received", {
        jobId: job.id,
        reviewId: job.data.reviewId,
        userId: job.data.userId,
    });

    return {
        received: true,
        reviewId: job.data.reviewId,
    };
};

// Create worker that listens to the monthly-review queue and for each job runs processMonthlyReviewJob.
// NOTE: Dequeueing is handled internally by the worker.
export const monthlyReviewWorker = new Worker<MonthlyReviewJobData>(
    MONTHLY_REVIEW_QUEUE_NAME,
    processMonthlyReviewJob,
    {
        connection: bullMqConnection,
        // Worker can process up to 2 jobs at the same time.
        concurrency: 2,
    },
);

// Log when worker is ready.
monthlyReviewWorker.on("ready", () => {
    console.log("Monthly review worker ready");
});

// Log successful jobs.
monthlyReviewWorker.on("completed", (job) => {
    console.log("Monthly review job completed", {
        jobId: job.id,
        reviewId: job.data.reviewId,
    });
});

// Log failed jobs.
monthlyReviewWorker.on("failed", (job, error) => {
    console.error("Monthly review job failed", {
        jobId: job?.id,
        reviewId: job?.data.reviewId,
        error: formatWorkerError(error),
    });
});

// Log worker-level errors, usually connection/runtime-level issues.
monthlyReviewWorker.on("error", (error) => {
    console.error("Monthly review worker error:", formatWorkerError(error));
});
