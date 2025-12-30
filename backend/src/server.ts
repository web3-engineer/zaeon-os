import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
    console.warn("Warning: GEMINI_API_KEY is not set.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
app.use(express.json());

app.post("/agent", async (req, res) => {
    try {
        const { message } = req.body as { message?: string };

        if (!message) {
            return res.status(400).json({ error: "message is required" });
        }

        const result = await model.generateContent(message);
        const text = result.response.text();

        return res.json({
            ok: true,
            reply: text,
        });
    } catch (err) {
        console.error("Agent error:", err);
        return res.status(500).json({ error: "internal_error" });
    }
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log(`Zaeon agent service listening on port ${port}`);
});