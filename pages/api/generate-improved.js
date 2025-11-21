import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

let cachedModelName = null;

// Função para carregar GEMINI_API_KEY do .env.local de forma garantida
function loadGeminiApiKey() {
  // Se já está carregado, retornar
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    return process.env.GEMINI_API_KEY.trim();
  }
  
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      console.error("❌ .env.local não encontrado em:", envPath);
      return null;
    }
    
    // Ler arquivo e remover BOM se houver
    let content = fs.readFileSync(envPath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.substring(1); // Remove UTF-8 BOM
    }
    
    // Método mais simples: dividir por linhas e procurar
    const lines = content.split(/\r?\n/);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line && line.startsWith('GEMINI_API_KEY=')) {
        const value = line.substring('GEMINI_API_KEY='.length).trim();
        
        if (value && value.length > 0) {
          const cleanValue = value.replace(/^["']|["']$/g, '').trim();
          process.env.GEMINI_API_KEY = cleanValue;
          console.log("✅ GEMINI_API_KEY carregada para generate-improved! Tamanho:", cleanValue.length);
          return cleanValue;
        }
      }
    }
    
    console.error("❌ GEMINI_API_KEY não encontrada no arquivo");
    return null;
  } catch (error) {
    console.error("❌ Erro ao carregar .env.local:", error.message);
    return null;
  }
}

async function resolveModelName(apiKey) {
  if (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim().length > 0) {
    return process.env.GEMINI_MODEL.trim();
  }

  if (cachedModelName) {
    return cachedModelName;
  }

  try {
    // Fazer requisição direta à API v1 (não v1beta) para listar modelos
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Erro ao listar modelos: ${data.error?.message || response.statusText}`);
    }
    
    const models = data.models || [];
    const supported = models
      .filter((model) =>
        (model.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((model) => model.name);

    console.log("📋 Modelos disponíveis na API v1:", supported);

    // Priorizar modelos mais recentes que funcionam na API v1
    const preferred =
      supported.find((name) => name.includes("2.0")) ||
      supported.find((name) => name.includes("1.5-flash")) ||
      supported.find((name) => name.includes("1.5-pro")) ||
      supported[0];

    if (preferred) {
      const normalized = preferred.replace(/^models\//, "");
      cachedModelName = normalized;
      console.log("✅ Modelo selecionado automaticamente:", normalized);
      return normalized;
    }
  } catch (error) {
    console.error("❌ Falha ao listar modelos da API v1:", error.message);
  }

  // Fallback para modelos que funcionam na API v1
  console.warn("⚠️ Usando fallback de modelo gemini-1.5-flash");
  return "gemini-1.5-flash";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Carregar a API key de forma garantida
  const apiKey = loadGeminiApiKey();
  
  if (!apiKey || apiKey.length === 0) {
    console.error("❌ GEMINI_API_KEY não pôde ser carregada");
    return res.status(500).json({ error: "Configuração do servidor incompleta. Contate o administrador." });
  }
  
  console.log("✅ API Key carregada com sucesso para generate-improved (tamanho:", apiKey.length + ")");

  try {
    const { originalResume, suggestions } = req.body;

    if (!originalResume || !suggestions) {
      return res.status(400).json({ error: "Dados insuficientes. Envie o currículo original e as sugestões." });
    }

    // Inicializar Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Listar modelos disponíveis na API v1 (não v1beta)
    let modelName = null;
    try {
      modelName = await resolveModelName(apiKey);
      console.log("✅ Modelo selecionado da API v1:", modelName);
    } catch (error) {
      console.warn("⚠️ Erro ao listar modelos:", error.message);
      // Fallback
      modelName = "gemini-1.5-flash";
      console.log("⚠️ Usando modelo fallback:", modelName);
    }
    
    console.log("🔁 Inicializando modelo Gemini:", modelName);
    
    // Criar o modelo
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      Você é um especialista em currículos da área de tecnologia.
      
      Com base no currículo original e nas sugestões de melhoria fornecidas, gere uma versão COMPLETA e MELHORADA do currículo.
      
      IMPORTANTE:
      - Mantenha TODAS as informações do currículo original
      - Aplique TODAS as melhorias sugeridas
      - Gere o currículo completo e finalizado, pronto para uso
      - Mantenha formato profissional e ATS-friendly
      - Não remova informações importantes
      - Apenas melhore e otimize o que foi sugerido
      
      CURRÍCULO ORIGINAL:
      ${originalResume}
      
      SUGESTÕES DE MELHORIA:
      ${suggestions}
      
      Agora gere o currículo melhorado completo:
    `;

    let responseText;
    try {
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } catch (libraryError) {
      // Fallback para chamada direta à API v1
      if (libraryError.message?.includes("v1beta") || libraryError.message?.includes("404")) {
        console.warn("⚠️ Biblioteca usando v1beta, fazendo chamada direta à API v1...");
        
        const v1Response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }]
            })
          }
        );
        
        if (!v1Response.ok) {
          const errorData = await v1Response.json();
          throw new Error(`API v1 error: ${errorData.error?.message || v1Response.statusText}`);
        }
        
        const v1Data = await v1Response.json();
        responseText = v1Data.candidates?.[0]?.content?.parts?.[0]?.text || 
                      JSON.stringify(v1Data);
      } else {
        throw libraryError;
      }
    }

    return res.status(200).json({
      improvedResume: responseText,
    });
  } catch (error) {
    console.error("Erro ao gerar currículo melhorado:", error);
    console.error("Stack trace:", error.stack);
    
    // Mensagens de erro mais específicas
    if (error.message?.includes("leaked") || error.message?.includes("reportada como vazada")) {
      return res.status(500).json({ 
        error: "Sua chave API foi reportada como vazada. Por favor, gere uma nova chave API no Google AI Studio e atualize o arquivo .env.local" 
      });
    }
    
    if (error.message?.includes("API key") || error.message?.includes("GEMINI") || error.message?.includes("401") || error.message?.includes("403")) {
      return res.status(500).json({ error: "Erro de autenticação com a API. Verifique as configurações." });
    }
    
    return res.status(500).json({ 
      error: error.message || "Erro ao gerar currículo melhorado. Tente novamente mais tarde." 
    });
  }
}

