import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const envPath = path.join(process.cwd(), '.env.local');
  const cwd = process.cwd();
  const fileExists = fs.existsSync(envPath);
  
  let fileContent = null;
  let parsedKey = null;
  let envKey = process.env.GEMINI_API_KEY;
  
  if (fileExists) {
    try {
      fileContent = fs.readFileSync(envPath, 'utf8');
      
      // Tentar parse manual
      const lines = fileContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.substring(0, eqIndex).trim();
            const value = trimmed.substring(eqIndex + 1).trim();
            if (key === 'GEMINI_API_KEY') {
              parsedKey = value;
              // Tentar definir
              process.env.GEMINI_API_KEY = value;
              break;
            }
          }
        }
      }
      
      // Tentar com regex também
      const regexMatch = fileContent.match(/GEMINI_API_KEY\s*=\s*(.+?)(?:\r?\n|$)/);
      
      res.status(200).json({
        cwd,
        envPath,
        fileExists,
        fileContent: fileContent.substring(0, 200), // Primeiros 200 chars
        fileLength: fileContent.length,
        parsedKey: parsedKey ? parsedKey.substring(0, 20) + "..." : null,
        parsedKeyLength: parsedKey?.length || 0,
        regexMatch: regexMatch ? regexMatch[1].substring(0, 20) + "..." : null,
        processEnvKey: envKey ? envKey.substring(0, 20) + "..." : null,
        processEnvKeyLength: envKey?.length || 0,
        afterSet: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 20) + "..." : null,
        afterSetLength: process.env.GEMINI_API_KEY?.length || 0,
        allLines: lines.map((l, i) => ({ line: i, content: l.substring(0, 50) }))
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        stack: error.stack,
        cwd,
        envPath,
        fileExists
      });
    }
  } else {
    res.status(200).json({
      cwd,
      envPath,
      fileExists: false,
      processEnvKey: envKey ? envKey.substring(0, 20) + "..." : null
    });
  }
}

