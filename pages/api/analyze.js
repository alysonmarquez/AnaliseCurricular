import formidable from "formidable";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    
    console.log("📄 Conteúdo lido (primeiros 60 chars):", content.substring(0, 60));
    console.log("📄 Tamanho:", content.length);
    
    // Método mais simples: dividir por linhas e procurar
    const lines = content.split(/\r?\n/);
    console.log("📄 Número de linhas:", lines.length);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      console.log(`📄 Linha ${i}:`, line.substring(0, 50));
      
      if (line && line.startsWith('GEMINI_API_KEY=')) {
        const value = line.substring('GEMINI_API_KEY='.length).trim();
        console.log(`✅ Chave encontrada na linha ${i}!`);
        console.log(`✅ Valor (primeiros 20 chars):`, value.substring(0, 20));
        
        if (value && value.length > 0) {
          const cleanValue = value.replace(/^["']|["']$/g, '').trim();
          process.env.GEMINI_API_KEY = cleanValue;
          console.log("✅ GEMINI_API_KEY definida! Tamanho:", cleanValue.length);
          console.log("✅ Preview:", cleanValue.substring(0, 15) + "...");
          return cleanValue;
        }
      }
    }
    
    console.error("❌ GEMINI_API_KEY não encontrada no arquivo");
    console.error("❌ Todas as linhas:", lines.map((l, i) => `Linha ${i}: ${l.substring(0, 50)}`));
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

export const config = {
  api: {
    bodyParser: false, // necessário para receber arquivos no Next 14
  },
};

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
  
  console.log("✅ API Key carregada com sucesso (tamanho:", apiKey.length + ")");

  let data = null;
  try {
    // Parse do arquivo usando formidable
    data = await new Promise((resolve, reject) => {
      const form = formidable({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      });

      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Erro ao fazer parse do formulário:", err);
          reject(err);
          return;
        }
        resolve({ fields, files });
      });
    });

    // Tratar o arquivo (pode ser array ou objeto único)
    let file = data.files.file;
    if (Array.isArray(file)) {
      file = file[0];
    }

    if (!file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    // Leitura do arquivo
    if (!file.filepath) {
      console.error("Arquivo sem filepath:", file);
      return res.status(400).json({ error: "Erro ao processar arquivo. Tente novamente." });
    }

    const fileBuffer = fs.readFileSync(file.filepath);
    let extractedText = "";

    // Detectar tipo de arquivo pelo mimetype ou extensão
    const fileExtension = path.extname(file.originalFilename || "").toLowerCase();
    const mimetype = file.mimetype || "";

    if (mimetype === "application/pdf" || fileExtension === ".pdf") {
      try {
        const pdfData = await pdf(fileBuffer);
        extractedText = pdfData.text;
      } catch (pdfError) {
        console.error("Erro ao ler PDF:", pdfError);
        return res.status(400).json({ error: "Erro ao ler arquivo PDF. Verifique se o arquivo está corrompido." });
      }
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileExtension === ".docx"
    ) {
      try {
        const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = docxData.value;
      } catch (docxError) {
        console.error("Erro ao ler DOCX:", docxError);
        return res.status(400).json({ error: "Erro ao ler arquivo DOCX. Verifique se o arquivo está corrompido." });
      }
    } else {
      return res.status(400).json({ 
        error: `Formato não suportado. Use arquivos PDF ou DOCX. Tipo recebido: ${mimetype || fileExtension}` 
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: "Não foi possível extrair texto do arquivo. Verifique se o arquivo contém texto." });
    }

    // Inicializando Gemini
    // A biblioteca @google/generative-ai usa v1beta por padrão
    // Vamos listar modelos da API v1 diretamente e usar um modelo compatível
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
    // NOTA: A biblioteca pode ainda usar v1beta internamente, mas vamos tentar
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      Você é um especialista em currículos da área de tecnologia e especialista em ATS.
      Analise o currículo fornecido e retorne em tópicos:

      - Pontos fracos
      - O que melhorar
      - Ajustes para ATS
      - Sugestão de estrutura
      - Sugestões específicas para área tech

      Texto extraído do currículo:
      ${extractedText}
    `;

    // A biblioteca pode estar usando v1beta, então vamos fazer chamada direta à API v1
    let responseText;
    try {
      // Tentar usar a biblioteca primeiro
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } catch (libraryError) {
      // Se falhar (provavelmente por usar v1beta), fazer chamada direta à API v1
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
        console.log("✅ Resposta recebida da API v1");
      } else {
        throw libraryError;
      }
    }

    // Limpar arquivo temporário
    try {
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    } catch (cleanupError) {
      console.warn("Erro ao limpar arquivo temporário:", cleanupError);
    }

    return res.status(200).json({
      text: extractedText,
      analysis: responseText,
    });
  } catch (error) {
    console.error("Erro ao processar:", error);
    console.error("Stack trace:", error.stack);
    
    // Limpar arquivo temporário em caso de erro (se data foi definido)
    try {
      if (data?.files?.file) {
        let file = data.files.file;
        if (Array.isArray(file)) file = file[0];
        if (file?.filepath && fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      }
    } catch (cleanupError) {
      console.warn("Erro ao limpar arquivo temporário:", cleanupError);
    }

    // Mensagens de erro mais específicas
    if (error.message?.includes("API key") || error.message?.includes("GEMINI")) {
      return res.status(500).json({ error: "Erro de autenticação com a API. Verifique as configurações." });
    }
    
    return res.status(500).json({ 
      error: error.message || "Erro ao analisar currículo. Tente novamente mais tarde." 
    });
  }
}
