import { env } from "../config/env";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AppError } from "../utils/AppError";

// JWT payload type from jsonwebtoken, and also require an id field of type number.
type AuthTokenPayload = JwtPayload & {
    id: number;
};

// Runtime type guard for the JWT payload. This verifies that the decoded runtime value has the shape we expect.
// Narrowing typescript concept: If this function returns true, treat decoded as AuthTokenPayload after this point.
const isAuthTokenPayload = (decoded: unknown): decoded is AuthTokenPayload => {
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
    _res: Response,
    next: NextFunction,
) => {
    try {
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
        if (error instanceof AppError) {
            next(error);
            return;
        }

        next(new AppError("Unauthorized: Invalid or expired token", 401));
    }
};
