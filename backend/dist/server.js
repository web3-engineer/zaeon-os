"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const generative_ai_1 = require("@google/generative-ai");
if (!process.env.GEMINI_API_KEY) {
    console.warn("Warning: GEMINI_API_KEY is not set.");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post("/agent", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "message is required" });
        }
        const result = await model.generateContent(message);
        const text = result.response.text();
        return res.json({
            ok: true,
            reply: text,
        });
    }
    catch (err) {
        console.error("Agent error:", err);
        return res.status(500).json({ error: "internal_error" });
    }
});
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Zaeon agent service listening on port ${port}`);
});
