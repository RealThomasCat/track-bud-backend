import { z } from "zod";

const emailSchema = z
    .email({ message: "Invalid email address" })
    .trim()
    .toLowerCase()
    .max(254, { message: "Email must be less than 254 characters" });

const passwordSchema = z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(128, { message: "Password must be less than 128 characters long" });

export const signupSchema = z.strictObject({
    name: z
        .string()
        .trim()
        .min(2, { message: "Name must be at least 2 characters long" })
        .max(80, { message: "Name must be less than 80 characters long" }),

    email: emailSchema,

    // Do not trim password. Spaces can be intentional password characters.
    password: passwordSchema,
});

export const loginSchema = z.strictObject({
    email: emailSchema,

    // Same bounds as signup to reject clearly invalid/abusive login payloads.
    password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
