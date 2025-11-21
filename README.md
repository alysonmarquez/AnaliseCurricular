# 🔍 Analisador de Currículos Tech (ATS)

Aplicação para análise de currículos usando IA (Google Gemini).

## 🚀 Configuração

1. Instale as dependências:
```bash
npm install
```

2. Configure a variável de ambiente:
   - Crie um arquivo `.env.local` na raiz do projeto
   - Adicione sua chave da API do Google Gemini:
   ```
   GEMINI_API_KEY=sua_chave_aqui
   ```
   - Obtenha sua chave em: https://makersuite.google.com/app/apikey

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

## 📝 Formatos Suportados

- PDF (.pdf)
- Word (.docx)

## 🛠️ Tecnologias

- Next.js 14
- React
- Tailwind CSS v4
- Google Gemini AI
- Formidable (upload de arquivos)
- PDF-Parse
- Mammoth (extração de texto DOCX)
