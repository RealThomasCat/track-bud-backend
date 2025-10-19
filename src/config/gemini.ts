import {env} from "./env";

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

// Type-only import for CommonJS with explicit resolution-mode
import type { GenerateContentConfig } from "@google/genai" with { "resolution-mode": "import" };

// Generates a concise AI response using Gemini 2.5 Flash
export async function generateWithGemini(
    prompt: string,
    systemInstruction?: string
): Promise<string> {
    try {
        const ai = await getGeminiClient();

        // Define config with strict typing
        const config: GenerateContentConfig = {
            maxOutputTokens: 250, // limit tokens for free plan
            temperature: 0.7,
            topP: 0.8,
            thinkingConfig: { thinkingBudget: 0 }, // disable reasoning
        };

        // Properly format system instruction as ContentUnion
        if (systemInstruction) {
            (config as any).systemInstruction = {
                role: "system",
                parts: [{ text: systemInstruction }],
            };
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config,
        });

        return response.text?.trim() || "No response generated.";
    } catch (error: any) {
        console.error("Gemini API Error:", error.message);
        throw new Error("Failed to communicate with Gemini API");
    }
}