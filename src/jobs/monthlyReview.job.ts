export const MONTHLY_REVIEW_QUEUE_NAME = "monthly-review";
export const MONTHLY_REVIEW_JOB_NAME = "generate-monthly-review";

// Job payload stored in Redis by BullMQ.
export type MonthlyReviewJobData = {
    reviewId: number;
    userId: number;
};
