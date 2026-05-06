// Utility function to extract authenticated user ID from request in typesafe and consistent way across controllers.
// We can use it in future in every controller that needs authenticated user ID to avoid repeating the same check and extraction logic.
import { Request } from "express";
import { AppError } from "./AppError";

export const getAuthenticatedUserId = (req: Request): number => {
    if (!req.user?.id) {
        throw new AppError("Unauthorized", 401);
    }

    return req.user.id;
};
