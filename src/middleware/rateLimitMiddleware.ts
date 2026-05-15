import { NextFunction, Request, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { AppError } from "../utils/AppError";

// Returns a stable rate-limit key (userId or IP) for the given request.
// Public routes use IP because the user is not authenticated yet.
// Protected routes prefer userId so users behind the same network do not block each other.
const getUserOrIpKey = (req: Request): string => {
    const userId = req.user?.id;

    // If user exists (user is authenticated), use userId as the key.
    if (userId) {
        return `user:${userId}`;
    }

    // Otherwise, fallback to IP address for unauthenticated requests.
    // req.ip can be undefined in Express types, so we safely fall back to socket remoteAddress.
    // Use express-rate-limit's helper so IPv6 clients are grouped safely.
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown-ip";

    return `ip:${ipKeyGenerator(ip)}`;
};

// Shared response handler for all rate limiters.
const rateLimitHandler = (
    _req: Request,
    _res: Response,
    next: NextFunction,
) => {
    next(new AppError("Too many requests. Please try again later.", 429));
};

// Global safety net for all API routes.
// This is intentionally generous. It protects against accidental loops, basic scraping, and noisy clients without affecting normal usage.
export const globalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 300, // 300 requests per 15 minutes per IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: rateLimitHandler,
});

// Strict limiters for authentication endpoints.
// Important for login/register/password-reset style endpoints because these routes are public and can be abused without an authenticated session.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only limit failed attempts.
    handler: rateLimitHandler,
});

// We split auth limiter into two separate limiters (login and register) to allow more flexibility.
// Main difference is the skipSuccessfulRequests option.
// For login, we want to only limit failed attempts to prevent brute-force attacks while allowing normal users to log in without hitting limits.
// For register, we want to enforce the limit strictly because successful registrations can also be abused (e.g. creating many fake accounts).
export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: rateLimitHandler,
});

// Limiter for AI endpoints. AI routes are expensive because they can trigger DB aggregation plus external Gemini/API calls.
export const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10, // 10 requests per hour per user/IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: getUserOrIpKey, // Use userId if available, otherwise fallback to IP
    handler: rateLimitHandler,
});

// Limiter for write-heavy operations.
// This protects create/update/delete routes while staying permissive enough
// for normal expense-entry behavior.
export const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 60, // 60 requests per 15 minutes per user/IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: getUserOrIpKey,
    handler: rateLimitHandler,
});

// Moderate limiter for dashboard aggregation endpoints.
// Dashboard routes can run aggregate/groupBy/raw SQL queries, so we prevent
// accidental frontend loops from repeatedly hitting expensive reads.
export const dashboardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // 100 requests per 15 minutes per user/IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: getUserOrIpKey,
    handler: rateLimitHandler,
});
