function safeJsonParse(text: string) {
    try {
        // Remove Markdown-style code fences like ```json ... ```
        const cleaned = text
            .replace(/```json\s*/gi, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(cleaned);
    } catch {
        // If still fails, just return as plain text wrapped in an object
        return { rawText: text };
    }
}
export default safeJsonParse;
