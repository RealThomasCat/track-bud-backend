import { env } from "../config/env";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AppError } from "../utils/AppError";
import { AuthTokenPayload } from "../utils/jwt";

// Define type of the payload jsonwebtoken returns after verification, which may also include JWT standard fields.
type VerifiedAuthTokenPayload = JwtPayload & AuthTokenPayload;

// Runtime type guard for the JWT payload. This verifies that the decoded runtime value has the shape we expect.
// Narrowing typescript concept: If this function returns true, treat decoded as AuthTokenPayload after this point.
const isAuthTokenPayload = (
    decoded: unknown,
): decoded is VerifiedAuthTokenPayload => {
    return (
        typeof decoded === "object" && // decoded must be a runtime object
        decoded !== null && // typeof null is also "object", so exclude null
        "id" in decoded && // decoded must contain an id property
        typeof (decoded as { id: unknown }).id === "number" // id must be a number
    );
};

// Middleware to verify token stored in HTTP-only cookie
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        // Authenticated API responses contain user-specific data and must not be stored by shared caches.
        res.setHeader("Cache-Control", "private, no-store");

        const token = req.cookies?.token; // read from cookie

        if (!token) {
            throw new AppError("Unauthorized: No token", 401);
        }

        // Verify JWT signature and expiry.
        const decoded = jwt.verify(token, env.jwtSecret!);

        // Validate decoded payload shape before trusting it.
        if (!isAuthTokenPayload(decoded)) {
            throw new AppError("Unauthorized: Invalid token payload", 401);
        }

        // Attach only the trusted fields needed by controllers.
        req.user = { id: decoded.id };

        next();
    } catch (error) {
        // If it is already a known auth error (from try block), send it to the global error handler as it is.
        if (error instanceof AppError) {
            next(error);
            return;
        }

        // Else Generic unauthorized error
        next(new AppError("Unauthorized: Invalid or expired token", 401));
    }
};
