import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Carregar variáveis de ambiente do .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error("Erro ao carregar .env.local:", result.error);
  }
}

export default function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = !!apiKey && apiKey.trim().length > 0;
  
  res.status(200).json({
    hasKey,
    keyLength: apiKey ? apiKey.length : 0,
    keyPreview: apiKey ? apiKey.substring(0, 10) + "..." : "não configurada",
    allEnvKeys: Object.keys(process.env).filter(k => k.includes("GEMINI") || k.includes("API")),
    envFileExists: fs.existsSync(envPath),
    cwd: process.cwd()
  });
}

