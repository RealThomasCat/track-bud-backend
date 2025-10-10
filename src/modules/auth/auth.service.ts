import { prisma } from "../../config/db";
import { hashPassword, comparePassword } from "../../utils/hash";
import { signToken } from "../../utils/jwt";
import { SignupInput, LoginInput } from "./auth.validation";

// --- CREATE USER ---
export const signupService = async (data: SignupInput) => {
    // Check if email exists
    const existing = await prisma.user.findUnique({
        where: { email: data.email },
    });
    if (existing) {
        const err = new Error("Email already registered");
        (err as any).statusCode = 400;
        throw err;
    }

    // Hash password before saving
    const hashed = await hashPassword(data.password);

    // Default categories (TODO: move to separate file)
    const defaultCategories = [
        "Food",
        "Transport",
        "Rent",
        "Utilities",
        "Health",
        "Entertainment",
        "Shopping",
        "Salary",
        "Investments",
        "Miscellaneous",
    ];

    // Use transaction for multiple related database operations
    const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await prisma.user.create({
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
            data: defaultCategories.map((name) => ({
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
        const err = new Error("Invalid credentials");
        (err as any).statusCode = 401;
        throw err;
    }

    // Compare plaintext and hashed passwords
    const isValid = await comparePassword(data.password, user.password);
    if (!isValid) {
        const err = new Error("Invalid credentials");
        (err as any).statusCode = 401;
        throw err;
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
        const err = new Error("User not found");
        (err as any).statusCode = 404;
        throw err;
    }

    return user;
};
