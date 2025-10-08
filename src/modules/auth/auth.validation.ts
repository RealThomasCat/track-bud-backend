import { z } from "zod";

export const signupSchema = z.object({
    name: z
        .string()
        .min(2, { message: "Name must be at least 2 characters long" }),
    email: z
        .email({ message: "Invalid email address" })
        .transform((val) => val.toLowerCase()),
    password: z
        .string()
        .min(6, { message: "Password must be at least 6 characters long" }),
});

export const loginSchema = z.object({
    email: z
        .email({ message: "Invalid email address" })
        .transform((val) => val.toLowerCase()),
    password: z
        .string()
        .min(6, { message: "Password must be at least 6 characters long" }),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
