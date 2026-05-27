// Consumer-side file. Creates worker and defines what to do when a monthly-review job is received.

import { MonthlyReviewStatus } from "@prisma/client";
import { Job, Worker } from "bullmq";
import { prisma } from "../../config/db";
import { bullMqConnection } from "../../config/bullmq";
import {
    MONTHLY_REVIEW_QUEUE_NAME,
    MonthlyReviewJobData,
} from "../monthlyReview.job";
import {
    aggregateMonthlyReviewData,
    buildDeterministicMonthlyReviewResult,
    buildInsufficientDataResult,
} from "../../modules/ai/monthlyReview/monthlyReview.aggregation";

const formatWorkerError = (error: Error) => ({
    name: error.name,
    message: error.message || "No error message provided",
    stack: error.stack,
});

// Helper to check whether the current worker run is the last allowed try for this job.
const isFinalJobAttempt = (job: Job<MonthlyReviewJobData>): boolean => {
    // If this job has a numeric attempts option, use it. Otherwise assume the job has only 1 attempt.
    // BullMQ supports an attempts job option, which controls how many times a failed job may be retried.
    const maxAttempts =
        typeof job.opts.attempts === "number" ? job.opts.attempts : 1;

    // BullMQ’s attemptsMade tracks how many attempts have already been made/failed for the job.
    // If current attempt number >= max attempts, this is the final attempt.
    return job.attemptsMade + 1 >= maxAttempts;
};

// Processes monthly review jobs from Redis.
// For now this saves a deterministic backend-generated result. Gemini interpretation will be added later.
const processMonthlyReviewJob = async (job: Job<MonthlyReviewJobData>) => {
    console.log("Monthly review job received", {
        jobId: job.id,
        reviewId: job.data.reviewId,
        userId: job.data.userId,
    });

    // Always read PostgreSQL before doing work. Redis/BullMQ is only the task runner.
    const review = await prisma.monthlyReview.findFirst({
        where: {
            id: job.data.reviewId,
            userId: job.data.userId,
        },
    });

    // Skip job if review not found in DB.
    if (!review) {
        console.warn(
            "Monthly review job skipped because review row was not found",
            {
                jobId: job.id,
                reviewId: job.data.reviewId,
                userId: job.data.userId,
            },
        );

        return {
            skipped: true,
            reason: "REVIEW_NOT_FOUND",
        };
    }

    // Skip job if status is not PENDING.
    if (review.status !== MonthlyReviewStatus.PENDING) {
        console.warn(
            "Monthly review job skipped because review is not pending",
            {
                jobId: job.id,
                reviewId: review.id,
                status: review.status,
            },
        );

        return {
            skipped: true,
            reason: "REVIEW_NOT_PENDING",
            status: review.status,
        };
    }

    // Move from PENDING to PROCESSING only if it is still pending.
    // This protects us from duplicate/stale jobs doing the same work twice.
    const processingUpdate = await prisma.monthlyReview.updateMany({
        where: {
            id: review.id,
            userId: review.userId,
            status: MonthlyReviewStatus.PENDING,
        },
        data: {
            status: MonthlyReviewStatus.PROCESSING,
            errorMessage: null,
            completedAt: null,
        },
    });

    // If no row was updated, another worker/process changed the review status after our initial read.
    // In that case this job is stale, so we skip it instead of generating the same review twice.
    if (processingUpdate.count === 0) {
        console.warn(
            "Monthly review job skipped because status changed before processing",
            {
                jobId: job.id,
                reviewId: review.id,
            },
        );

        return {
            skipped: true,
            reason: "STATUS_CHANGED",
        };
    }

    try {
        // Aggregate compact financial metrics from PostgreSQL.
        // Do not send raw transactions or transaction notes to AI in later steps.
        const aggregation = await aggregateMonthlyReviewData(review);

        // If the review period has too little activity, store an insufficient-data result and stop.
        // This avoids spending AI tokens on a report that would be too weak to be useful.
        if (!aggregation.hasEnoughData) {
            await prisma.monthlyReview.update({
                where: {
                    id: review.id,
                },
                data: {
                    status: MonthlyReviewStatus.INSUFFICIENT_DATA,
                    dataQualityLevel: aggregation.dataQualityLevel,
                    transactionCount: aggregation.current.transactionCount,
                    result: buildInsufficientDataResult(aggregation),
                    errorMessage: null,
                    completedAt: new Date(),
                },
            });

            return {
                insufficientData: true,
                reviewId: review.id,
                transactionCount: aggregation.current.transactionCount,
            };
        }

        // Build the current deterministic report from backend metrics.
        // In the Gemini step, this will be replaced with validated AI interpretation over the same compact aggregation.
        const result = buildDeterministicMonthlyReviewResult(aggregation);

        // Update monthly review with deterministic result and computed data quality.
        await prisma.monthlyReview.update({
            where: {
                id: review.id,
            },
            data: {
                status: MonthlyReviewStatus.COMPLETED,
                dataQualityLevel: aggregation.dataQualityLevel,
                transactionCount: aggregation.current.transactionCount,
                result,
                errorMessage: null,
                completedAt: new Date(),
            },
        });

        return {
            completed: true,
            reviewId: review.id,
        };
    } catch (error) {
        const finalAttempt = isFinalJobAttempt(job);

        // If the current attempt failed after PROCESSING, keep PostgreSQL consistent with BullMQ retry behavior.
        // Non-final attempts go back to PENDING so the retry can pick them up again.
        // Final attempt becomes FAILED so the frontend can stop showing an endless generating state.
        await prisma.monthlyReview.updateMany({
            where: {
                id: review.id,
                userId: review.userId,
                status: MonthlyReviewStatus.PROCESSING,
            },
            data: finalAttempt
                ? {
                      status: MonthlyReviewStatus.FAILED,
                      errorMessage:
                          "Monthly review generation failed. Please try again later.",
                      completedAt: new Date(),
                  }
                : {
                      status: MonthlyReviewStatus.PENDING,
                      errorMessage: null,
                      completedAt: null,
                  },
        });

        throw error;
    }
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
