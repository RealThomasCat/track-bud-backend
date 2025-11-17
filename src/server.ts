import app from "./app";

// Render always provides process.env.PORT at runtime
// So we read it directly here instead of from env.ts
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
