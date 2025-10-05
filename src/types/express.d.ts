import "express";

// This file extends the Express Request type globally
declare module "express-serve-static-core" {
    interface Request {
        user?: { id: number };
    }
}
