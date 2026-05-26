import { MonthlyReview, MonthlyReviewStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../config/db";
import { AppError } from "../../../utils/AppError";
import { enqueueMonthlyReviewJob } from "../../../jobs/queues/monthlyReview.queue";

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

type MonthlyReviewPeriod = {
    periodStart: Date;
    periodEnd: Date;
    comparisonStart: Date;
    comparisonEnd: Date;
    title: string;
};

type CreateMonthlyReviewResult = {
    review: MonthlyReview;
    created: boolean;
};

// Helper to calculate the default review period.
// Default target is the previous completed calendar month.
// Example: if today is May 20, the review period is April 1 <= transaction date < May 1.
const getPreviousCompletedMonthlyReviewPeriod = (
    referenceDate = new Date(),
): MonthlyReviewPeriod => {
    const currentYear = referenceDate.getUTCFullYear();
    const currentMonth = referenceDate.getUTCMonth();

    const periodStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(currentYear, currentMonth, 1));
    const comparisonStart = new Date(
        Date.UTC(currentYear, currentMonth - 2, 1),
    );
    const comparisonEnd = periodStart;

    const monthName = MONTH_NAMES[periodStart.getUTCMonth()];
    const title = `${monthName} ${periodStart.getUTCFullYear()} Monthly Review`;

    return {
        periodStart,
        periodEnd,
        comparisonStart,
        comparisonEnd,
        title,
    };
};

// Helper to fetch the existing monthly review for a user and target period.
const findMonthlyReviewForPeriod = async (
    userId: number,
    periodStart: Date,
    periodEnd: Date,
) => {
    return prisma.monthlyReview.findUnique({
        where: {
            userId_periodStart_periodEnd: {
                userId,
                periodStart,
                periodEnd,
            },
        },
    });
};

// Helper to detect if an error is a Prisma unique constraint error.
const isUniqueConstraintError = (error: unknown): boolean => {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    );
};

// --- CREATE MONTHLY REVIEW ---
export const createMonthlyReviewService = async (
    userId: number,
): Promise<CreateMonthlyReviewResult> => {
    // Calculate target period on the backend so clients cannot request arbitrary months.
    const period = getPreviousCompletedMonthlyReviewPeriod();

    // Find existing review if this user already requested/generated one for the same month.
    const existingReview = await findMonthlyReviewForPeriod(
        userId,
        period.periodStart,
        period.periodEnd,
    );

    // If review exists then return with created and enqueued set to false.
    if (existingReview) {
        return {
            review: existingReview,
            created: false,
        };
    }

    // Else create review.
    let createdReview: MonthlyReview;

    // This try-catch block is intentionally kept in the service because it handles a real race condition.
    // Two requests can try to create the same monthly review at the same time.
    try {
        // Create the source-of-truth PostgreSQL row before adding the BullMQ job.
        createdReview = await prisma.monthlyReview.create({
            data: {
                userId,
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                comparisonStart: period.comparisonStart,
                comparisonEnd: period.comparisonEnd,
                title: period.title,
            },
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            // Find monthly review in DB.
            const review = await findMonthlyReviewForPeriod(
                userId,
                period.periodStart,
                period.periodEnd,
            );

            // Return the existing review with created and enqueued set to false.
            if (review) {
                return {
                    review,
                    created: false,
                };
            }
        }

        // Throw unknown DB error. Will be handled by errorHandler.
        throw error;
    }

    // try-catch block because we have to update monthy review row if job creation fails
    try {
        // Add the async job only after the DB row exists.
        const job = await enqueueMonthlyReviewJob({
            reviewId: createdReview.id,
            userId,
        });

        // Store BullMQ jobId in DB row for tracing/debugging.
        const reviewWithJobId = await prisma.monthlyReview.update({
            where: { id: createdReview.id },
            data: {
                jobId: job.id ?? null,
            },
        });

        // Return the created and enqueued monthly review.
        return {
            review: reviewWithJobId,
            created: true,
        };
    } catch (error) {
        // log error because queueing is an external infrastructure step, and we convert it into a generic user-facing AppError.
        console.error("Failed to enqueue monthly review job:", error);

        // If queueing fails, mark the persisted review as FAILED so the frontend does not stay stuck on PENDING.
        await prisma.monthlyReview.update({
            where: { id: createdReview.id },
            data: {
                status: MonthlyReviewStatus.FAILED,
                errorMessage:
                    "Monthly review generation could not be queued. Please try again later.",
                completedAt: new Date(),
            },
        });

        // Using AppError because errorHandler don't handle queueing errors.
        throw new AppError("Failed to queue monthly review generation", 503);
    }
};

// --- GET CURRENT MONTHLY REVIEW ---
export const getCurrentMonthlyReviewService = async (userId: number) => {
    // Use the same target period as POST /monthly-review.
    // This lets the frontend check whether the current default review exists.
    const period = getPreviousCompletedMonthlyReviewPeriod();

    const review = await findMonthlyReviewForPeriod(
        userId,
        period.periodStart,
        period.periodEnd,
    );

    return {
        review,
        targetPeriod: {
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            comparisonStart: period.comparisonStart,
            comparisonEnd: period.comparisonEnd,
            title: period.title,
        },
    };
};

// --- GET MONTHLY REVIEW BY ID ---
export const getMonthlyReviewByIdService = async (
    userId: number,
    id: number,
) => {
    // Use findFirst instead of findUnique so ownership is checked in the same query.
    const review = await prisma.monthlyReview.findFirst({
        where: {
            id,
            userId,
        },
    });

    if (!review) {
        throw new AppError("Monthly review not found", 404);
    }

    return review;
};
