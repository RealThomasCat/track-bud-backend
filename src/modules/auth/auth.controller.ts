import { Request, Response, NextFunction } from "express";
import { signupSchema, loginSchema } from "./auth.validation";
import { signupService, loginService, meService } from "./auth.service";
import { COOKIE_OPTIONS } from "../../utils/jwt";

// --- SIGNUP ---
export const signup = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const data = signupSchema.parse(req.body);
        const result = await signupService(data);

        // Send JWT via secure HTTP-only cookie
        res.cookie("token", result.token, COOKIE_OPTIONS);

        res.status(201).json({
            success: true,
            user: result.user,
            message: "Signup successful",
        });
    } catch (error) {
        next(error);
    }
};

// --- LOGIN ---
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const data = loginSchema.parse(req.body);
        const result = await loginService(data);

        // Send JWT via cookie instead of JSON body
        res.cookie("token", result.token, COOKIE_OPTIONS);

        res.status(200).json({
            success: true,
            user: result.user,
            message: "Login successful",
        });
    } catch (error) {
        next(error);
    }
};

// --- LOGOUT ---
// Clears the cookie from browser (server-side logout)
export const logout = async (_: Request, res: Response) => {
    // Create a shallow copy of COOKIE_OPTIONS without maxAge
    const { maxAge, ...clearOptions } = COOKIE_OPTIONS;

    // Clear the cookie by setting same name + empty value
    res.clearCookie("token", clearOptions); // Use same options except maxAge

    res.status(200).json({ success: true, message: "Logged out successfully" });
};

// --- GET CURRENT USER ---
export const me = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id!;
        const user = await meService(userId);

        res.status(200).json({
            success: true,
            user,
            message: "User profile retrieved successfully",
        });
    } catch (error) {
        next(error);
    }
};
