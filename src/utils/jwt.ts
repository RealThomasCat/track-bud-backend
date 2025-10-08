import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "1h"; // ⏱ short lifespan for safety

// Sign JWT containing only userId
export const signToken = (userId: number) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Standard cookie config used everywhere
export const COOKIE_OPTIONS = {
    httpOnly: true, // cannot be accessed via JS (protects from XSS)
    secure: process.env.NODE_ENV === "production", // send only over HTTPS in production
    sameSite: "strict" as const, // prevents CSRF (If frontend and backend on different domains, switch to 'none'.)
    path: "/", // cookie sent with every request
    maxAge: 60 * 60 * 1000, // 1 hour (matches token expiry)
};
