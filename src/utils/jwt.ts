import jwt from "jsonwebtoken";
import { env } from "../config/env";

const JWT_SECRET = env.jwtSecret!;
const JWT_EXPIRES_IN = "1h";

// Sign JWT containing only userId
export const signToken = (userId: number) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const sameSiteValue: "none" | "lax" | "strict" =
    env.nodeEnv === "production" ? "none" : "lax";

// Standard cookie config used everywhere
export const COOKIE_OPTIONS = {
    httpOnly: true, // cannot be accessed via JS (protects from XSS)
    secure: env.nodeEnv === "production", // send only over HTTPS in production
    sameSite: sameSiteValue,
    path: "/", // cookie sent with every request
    maxAge: 60 * 60 * 1000, // 1 hour (matches token expiry)
};
