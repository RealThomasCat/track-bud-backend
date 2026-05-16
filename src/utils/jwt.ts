import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Define the shape of our JWT payload for better type safety
export type AuthTokenPayload = {
    id: number;
};

const JWT_SECRET = env.jwtSecret;
const JWT_EXPIRES_IN = env.jwtExpiresIn;

// Sign JWT containing only userId. Keep the payload minimal so the token does not expose unnecessary user data.
export const signToken = (userId: number): string => {
    const payload: AuthTokenPayload = { id: userId };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
};

const sameSiteValue: "none" | "lax" | "strict" =
    env.nodeEnv === "production" ? "none" : "lax";

const partitionedValue: boolean = env.nodeEnv === "production" ? true : false;

// Standard cookie config used everywhere
export const COOKIE_OPTIONS = {
    httpOnly: true, // cannot be accessed via JS (protects from XSS)
    secure: env.nodeEnv === "production", // send only over HTTPS in production
    sameSite: sameSiteValue,
    path: "/", // cookie sent with every request
    maxAge: env.jwtCookieMaxAgeMs,
    partitioned: partitionedValue, // for cross-site contexts
};

// NOTE: Because have only access token mechanism we don't have to make cookie live longer than token
// Because doing that would introduce noisy "Invalid token" error
// We can increase cookie maxAge in future when we implement refresh tokens.
