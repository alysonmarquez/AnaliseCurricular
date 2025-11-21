import { useState, useRef } from "react";
import UpsellBlock from "../components/UpsellBlock";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || 
          droppedFile.name.endsWith(".pdf") ||
          droppedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          droppedFile.name.endsWith(".docx")) {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Por favor, selecione apenas arquivos PDF ou DOCX.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecione um arquivo primeiro.");
      return;
    }

    setError("");
    setLoading(true);
    setAnalysis("");
    setOriginalText("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        console.error("Erro ao parsear resposta JSON:", jsonError);
        setError("Resposta inválida do servidor. Tente novamente.");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Erro ao analisar currículo.");
      } else {
        setAnalysis(data.analysis);
        setOriginalText(data.text || "");
      }
    } catch (err) {
      console.error("Erro na requisição:", err);
      setError("Falha ao conectar com o servidor. Verifique sua conexão e tente novamente.");
    }

    setLoading(false);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🔍 Analisador de Currículos Tech
          </h1>
          <p className="text-slate-400 text-lg">Análise inteligente com IA para otimizar seu currículo ATS</p>
        </div>

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-3xl shadow-2xl p-8 mb-8">
            
            {/* Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? "border-blue-500 bg-blue-500/10 scale-105"
                  : "border-slate-600 hover:border-slate-500 bg-slate-800/30"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-4xl">
                  📄
                </div>
                
                {!file ? (
                  <>
                    <h3 className="text-xl font-semibold mb-2">
                      Arraste seu currículo aqui
                    </h3>
                    <p className="text-slate-400 mb-4">ou</p>
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      Selecionar Arquivo
                    </label>
                    <p className="text-sm text-slate-500 mt-4">
                      Formatos suportados: PDF, DOCX (máx. 10MB)
                    </p>
                  </>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-between bg-slate-700/50 rounded-xl p-4 mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-2xl">
                          ✓
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-green-400">{file.name}</p>
                          <p className="text-sm text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-blue-400 hover:text-blue-300 underline text-sm"
                    >
                      Trocar arquivo
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`w-full mt-6 px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform ${
                !file || loading
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analisando com IA...
                </span>
              ) : (
                "🚀 Analisar Currículo"
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-red-400">Erro</p>
                    <p className="text-sm text-red-300 mt-1">{error}</p>
                    {error.includes("Configuração do servidor") && (
                      <p className="text-xs text-red-200 mt-2">
                        Verifique se você criou o arquivo <code className="bg-slate-900 px-2 py-1 rounded">.env.local</code> com a variável <code className="bg-slate-900 px-2 py-1 rounded">GEMINI_API_KEY</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Loading Progress */}
            {loading && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-center space-x-2 text-slate-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
                <p className="text-center text-slate-400 text-sm">
                  Processando currículo... isso pode levar alguns segundos.
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          {analysis && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-3xl shadow-2xl p-8 animate-fadeIn">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center space-x-3">
                  <span className="text-3xl">📊</span>
                  <span>Resultado da Análise</span>
                </h2>
                <button
                  onClick={copyText}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  }`}
                >
                  {copied ? "✓ Copiado!" : "📋 Copiar"}
                </button>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200 font-sans overflow-x-auto">
                  {analysis}
                </pre>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    setAnalysis("");
                    setOriginalText("");
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                >
                  🔄 Nova Análise
                </button>
              </div>
            </div>
          )}

          {/* Upsell Block */}
          {analysis && originalText && (
            <UpsellBlock 
              analysis={analysis}
              originalText={originalText}
              fileName={file?.name || "curriculo"}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500 text-sm">
          <p>Powered by Google Gemini AI • Desenvolvido para otimização ATS</p>
        </div>
      </div>
    </div>
  );
}
