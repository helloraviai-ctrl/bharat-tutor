# Bharat Tutor — Quickstart


### 1) Clone & install
```bash
npm i
```


### 2) Local env (optional) — copy `.env.example` to `.env`
```bash
cp .env.example .env
# edit PROVIDER and keys; locally, netlify dev will read .env
```


### 3) Dev server (Netlify Functions + static front-end)
```bash
npx netlify dev
# open http://localhost:8888
```


### 4) Configure Netlify (production)
- Push to GitHub.
- On Netlify → **New site from Git** → select repo.
- Set **Build settings**: publish folder = `public`, functions = `netlify/functions`.
- Add **Environment variables**:
- `PROVIDER=gemini` (or `cohere`)
- `GEMINI_API_KEY=…` (or `COHERE_API_KEY=…`)
- Deploy.


### 5) Use
- Paste optional **Context** to guide answers.
- Ask in Hindi/English. App replies Hindi first, then 2‑line English summary.
- Toggle **Speak answers** and pick a **Hindi voice**.


### Notes
- API keys are kept **server-side** in Netlify Functions.
- TTS quality depends on available browser voices; choose a high-quality Hindi voice in the selector.
- For advanced retrieval (PDFs, notes), we can add client-side PDF parsing and include top snippets in `context`.