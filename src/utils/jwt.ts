import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Helper to sign JWT tokens for user authentication
export const signToken = (userId: number): string => {
    // env.jwtSecret is a string (from .env)
    return jwt.sign({ userId }, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn as any, // Note: The 'as any' cast is used here to bypass TypeScript type issues with expiresIn.
    });
};
