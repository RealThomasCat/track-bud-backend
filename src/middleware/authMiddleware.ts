import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Middleware to verify token stored in HTTP-only cookie
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies?.token; // read from cookie

        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized: No token" });
        }

        // Verify JWT signature
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        req.user = decoded as { id: number }; // attach user info to request
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid or expired token",
        });
    }
};
