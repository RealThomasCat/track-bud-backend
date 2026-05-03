import { prisma } from "../../config/db";
import { hashPassword, comparePassword } from "../../utils/hash";
import { signToken } from "../../utils/jwt";
import { SignupInput, LoginInput } from "./auth.validation";
import { DEFAULT_CATEGORIES } from "../../constants/defaultCategories";
import { AppError } from "../../utils/AppError";

// --- CREATE USER ---
export const signupService = async (data: SignupInput) => {
    // Check if email exists
    const existing = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (existing) {
        throw new AppError("Email already registered", 409);
    }

    // Hash password before saving
    const hashed = await hashPassword(data.password);

    // Use transaction for multiple related database operations
    const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashed,
            },
        });

        // Create a default wallet for the new user
        const wallet = await tx.wallet.create({
            data: {
                userId: user.id,
                name: "Main Wallet",
                isDefault: true,
            },
        });

        // Create default categories for the new user
        await tx.category.createMany({
            data: DEFAULT_CATEGORIES.map((name) => ({
                name,
                userId: user.id,
                isDefault: true,
            })),
        });

        return { user, wallet };
    });

    // Generate JWT containing userId
    const token = signToken(result.user.id);

    return {
        user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
        },
        token,
    };
};

// --- LOGIN USER ---
export const loginService = async (data: LoginInput) => {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
        throw new AppError("Invalid credentials", 401);
    }

    // Compare plaintext and hashed passwords
    const isValid = await comparePassword(data.password, user.password);

    if (!isValid) {
        throw new AppError("Invalid credentials", 401);
    }

    const token = signToken(user.id);

    return {
        user: { id: user.id, name: user.name, email: user.email },
        token,
    };
};

// --- FETCH CURRENT USER ---
export const meService = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, defaultCurrency: true },
    });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return user;
};
