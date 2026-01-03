import mongoose, { Schema, model, models } from 'mongoose';

const WorkspaceSchema = new Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    title: { type: String, default: "Untitled Research" },
    content: { type: String, default: "" }, // O texto do documento (lado direito)
    agent: { type: String, default: "zenita" }, // Qual agente estava ativo
    terminalLogs: [String], // Logs do terminal
    chatHistory: [
        {
            role: { type: String, enum: ['user', 'ai'] },
            text: { type: String },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    lastModified: { type: Date, default: Date.now }
});

// Impede que o Next.js tente recriar o modelo se ele já existir
const Workspace = models.Workspace || model('Workspace', WorkspaceSchema);

export default Workspace;