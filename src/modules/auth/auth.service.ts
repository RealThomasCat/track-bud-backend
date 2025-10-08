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

    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashed,
        },
    });

    // Generate JWT containing userId
    const token = signToken(user.id);

    return {
        user: { id: user.id, name: user.name, email: user.email },
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
