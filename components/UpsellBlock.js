import { useState } from "react";

export default function UpsellBlock({ analysis, originalText, fileName }) {
  const [showModal, setShowModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [paid, setPaid] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [improvedResume, setImprovedResume] = useState("");
  const [copiedImproved, setCopiedImproved] = useState(false);

  const pixCode = "00020126360014br.gov.bcb.pix0114+558699933635252040000530398654044.995802BR5925FRANCISCO ALYSON SOUSA MA6009Sao Paulo62290525REC692097AADBFB3428958046630401D2";
  const pixKey = "+55 86 99933-6352";
  const pixValue = "R$ 4,99";

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    } catch (err) {
      console.error("Erro ao copiar código Pix:", err);
    }
  };

  const handleGenerateImproved = async () => {
    if (!analysis || !originalText) {
      alert("Erro: Dados da análise não disponíveis.");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/generate-improved", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalResume: originalText,
          suggestions: analysis,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar currículo melhorado");
      }

      const data = await response.json();
      setImprovedResume(data.improvedResume);
    } catch (err) {
      console.error("Erro ao gerar currículo melhorado:", err);
      alert("Erro ao gerar currículo melhorado. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  const copyImprovedResume = async () => {
    try {
      await navigator.clipboard.writeText(improvedResume);
      setCopiedImproved(true);
      setTimeout(() => setCopiedImproved(false), 3000);
    } catch (err) {
      console.error("Erro ao copiar currículo melhorado:", err);
    }
  };

  const downloadImprovedResume = () => {
    const blob = new Blob([improvedResume], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ? `curriculo-melhorado-${fileName.replace(/\.[^/.]+$/, "")}.txt` : "curriculo-melhorado.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (improvedResume) {
    return (
      <div className="mt-8 bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-sm border border-green-500/50 rounded-3xl shadow-2xl p-8 animate-fadeIn">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-3xl font-bold text-green-400 mb-2">
            Currículo Melhorado Gerado!
          </h2>
          <p className="text-slate-300">
            Seu currículo foi atualizado com todas as melhorias sugeridas.
          </p>
        </div>

        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700 mb-6">
          <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200 font-sans overflow-x-auto max-h-96 overflow-y-auto">
            {improvedResume}
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={copyImprovedResume}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
              copiedImproved
                ? "bg-green-600 text-white"
                : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            }`}
          >
            {copiedImproved ? "✓ Copiado!" : "📋 Copiar Currículo"}
          </button>
          <button
            onClick={downloadImprovedResume}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105"
          >
            💾 Baixar Arquivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bloco de Upsell */}
      <div className="mt-8 bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm border border-purple-500/50 rounded-3xl shadow-2xl p-8 animate-fadeIn">
        <div className="text-center">
          <div className="text-5xl mb-4">🚀</div>
          <p className="text-xl text-slate-200 mb-6">
            Deseja receber seu currículo atualizado com todas as melhorias aplicadas?
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-lg text-white transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Quero meu currículo melhorado
          </button>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">
                  Pagamento via Pix – {pixValue}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-white transition-colors text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Conteúdo */}
              <div className="space-y-6">
                <p className="text-slate-300 text-lg">
                  Pague {pixValue} usando o código Pix Copia e Cola abaixo e seu currículo melhorado será gerado automaticamente.
                </p>

                {/* Informações do Pix */}
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-400 text-sm mb-2">Chave Pix (telefone):</p>
                      <p className="text-white font-semibold">{pixKey}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm mb-2">Valor:</p>
                      <p className="text-green-400 font-bold text-xl">{pixValue}</p>
                    </div>
                  </div>
                </div>

                {/* Campo do código Pix */}
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Código Pix Copia e Cola:
                  </label>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={pixCode}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows="4"
                    />
                  </div>
                  <button
                    onClick={copyPixCode}
                    className={`mt-3 w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                      copiedPix
                        ? "bg-green-600 text-white"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    }`}
                  >
                    {copiedPix ? "✓ Código Pix copiado!" : "📋 Copiar código Pix"}
                  </button>
                </div>

                {/* Botão Já paguei */}
                {!paid ? (
                  <button
                    onClick={() => setPaid(true)}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-semibold text-lg text-white transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    ✅ Já paguei
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4">
                      <p className="text-green-400 font-semibold text-center">
                        ✓ Pagamento confirmado! Agora você pode gerar seu currículo melhorado.
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateImproved}
                      disabled={generating}
                      className={`w-full px-6 py-4 rounded-xl font-semibold text-lg text-white transition-all duration-200 transform hover:scale-105 shadow-lg ${
                        generating
                          ? "bg-slate-700 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      }`}
                    >
                      {generating ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Gerando currículo melhorado...
                        </span>
                      ) : (
                        "🎯 Gerar currículo atualizado"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

