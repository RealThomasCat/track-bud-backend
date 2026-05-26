// Worker process entrypoint. Imports/starts the background worker process and handles shutdown.

import { monthlyReviewWorker } from "./jobs/workers/monthlyReview.worker";

let isShuttingDown = false;

// NOTE: This Node.js process is separate from the Express API server.
console.log("Worker process started");

// When the process is stopped, close the BullMQ worker cleanly.
const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    console.log(`${signal} received. Closing worker gracefully...`);

    try {
        await monthlyReviewWorker.close();
        console.log("Monthly review worker closed");
        process.exit(0);
    } catch (error) {
        console.error("Error while closing worker:", error);
        process.exit(1);
    }
};

process.on("SIGINT", () => {
    void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void gracefulShutdown("SIGTERM");
});
