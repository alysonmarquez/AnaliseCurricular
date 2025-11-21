// Wrapper simples para chamar o LLM. Por padrão usa OpenAI (chat completions / responses API).
// Configure a variável OPENAI_API_KEY no ambiente.


import OpenAI from "openai";


const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

console.log("KEY carregada?", !!process.env.OPENAI_API_KEY);

export async function analyzeWithLLM(prompt) {
if (!openai) throw new Error('OPENAI_API_KEY não configurada no ambiente');


// Exemplo usando a API de respostas (ajuste conforme versão da lib)
const response = await openai.chat.completions.create({
model: "gpt-4o-mini", // substitua por gpt-4o, gpt-4o-mini, etc.
messages: [
{ role: "system", content: "Você é um especialista sênior em currículos tech. Seja direto e prático." },
{ role: "user", content: prompt }
],
max_tokens: 800,
temperature: 0.0
});


// Dependendo da lib, a resposta pode estar em response.choices[0].message.content
const text = response.choices?.[0]?.message?.content ?? response.output_text ?? JSON.stringify(response);
return text;
}