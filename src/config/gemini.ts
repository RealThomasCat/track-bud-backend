import { env } from "./env";
import { z } from "zod";

// Type-only import for CommonJS with explicit resolution-mode
import type { GenerateContentConfig } from "@google/genai" with {
    "resolution-mode": "import",
};

// Dynamically loads the GoogleGenAI SDK.
// google/genai currently only supports ESM, which can cause import issues in CommonJS projects.
// We use dynamic import to avoid ESM import errors.
async function getGeminiClient() {
    const { GoogleGenAI } = await import("@google/genai");

    // Initialize Gemini client (API key validated via env)
    return new GoogleGenAI({
        apiKey: env.geminiApiKey,
    });
}

// Create an object type named GenerateStructuredOptions. It depends on one type variable called TSchema. TSchema must be a Zod schema.
// TSchema means whatever schema type the caller passes, <TSchema extends z.ZodTypeAny> means "TSchema can be any type, BUT it must be a Zod schema type."
type GenerateStructuredOptions<TSchema extends z.ZodTypeAny> = {
    prompt: string;
    schema: TSchema; // The schema property must be exactly the same schema type that was passed in.
    responseSchema: GenerateContentConfig["responseSchema"]; // Use whatever type @google/genai expects for config.responseSchema.
    systemInstruction?: string;
};

// Generates validated structured JSON from Gemini.
export async function generateStructuredWithGemini<
    TSchema extends z.ZodTypeAny,
>({
    prompt,
    schema,
    responseSchema,
    systemInstruction,
}: GenerateStructuredOptions<TSchema>): Promise<z.infer<TSchema>> {
    // This async function returns a Promise. When awaited, the value has the TypeScript type inferred from the Zod schema.
    try {
        const ai = await getGeminiClient();

        // Define config for structured response generation.
        const config: GenerateContentConfig = {
            maxOutputTokens: 500,
            temperature: 0.2,
            topP: 0.8,
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: "application/json", // Ask Gemini to return JSON only
            responseSchema, // Use a response schema so the model generates predictable JSON
        };

        // If a system instruction is provided, include it in the config.
        if (systemInstruction) {
            config.systemInstruction = {
                role: "system",
                parts: [{ text: systemInstruction }],
            };
        }

        // Call Gemini API to generate content based on the prompt and config.
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config,
        });

        // Extract and validate the response text.
        const rawText = response.text?.trim();

        if (!rawText) {
            throw new Error("Gemini returned an empty response");
        }

        // Parse the raw text as JSON and validate it against the provided Zod schema.
        return schema.parse(JSON.parse(rawText));
    } catch (error: any) {
        console.error("Gemini API Error:", error.message);
        throw new Error("Failed to generate valid AI response");
    }
}
