import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Middleware to protect routes that require authentication
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Expecting header: Authorization: Bearer <token>
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res
            .status(401)
            .json({ message: "Unauthorized: No token provided" });
    }

    try {
        // Verify token using JWT secret
        const decoded = jwt.verify(token, env.jwtSecret) as { userId: number }; // Type assertion: It tells TypeScript what the decoded token should look like

        // Attach user info to request for downstream access
        req.user = { id: decoded.userId };

        // Continue to next middleware or controller
        next();
    } catch {
        // Token invalid or expired
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};
