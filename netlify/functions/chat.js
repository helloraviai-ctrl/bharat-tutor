/* eslint-disable */
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "POST only" }) };
  }

  try {
    // Accept only prompt + context; system is fixed server-side
    const { prompt, context } = JSON.parse(event.body || "{}");

    if (!prompt || typeof prompt !== "string") {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Missing prompt" }) };
    }
    if (prompt.length > 4000) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Prompt too long (max 4000 chars)" }) };
    }

    const PROVIDER = (process.env.PROVIDER || "gemini").toLowerCase();

    // 🔒 Fixed, server-side system prompt
    const baseSystem =
      "You are Bharat Tutor. First respond in clear, simple Hindi. Then add a 2-line English summary.\n" +
      "Format your answer in clean Markdown with bullet points and line breaks. For math, use LaTeX inside $...$ (inline) or $$...$$ (block).\n" +
      "Use concise, step-by-step reasoning for math and science. If there is a section starting with 'Context:' above, rely on it strongly. " +
      "If not enough info, ask one short follow-up question. Keep answers to 8 bullets or fewer.";

    const ctx =
      context && String(context).trim().length
        ? `Context:\n${String(context).trim()}\n\n`
        : "";

    const augmented = `${ctx}SYSTEM:\n${baseSystem}\n\nUSER:\n${prompt}`;

    // ─────────────────────────── GEMINI ───────────────────────────
    if (PROVIDER === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return {
          statusCode: 500,
          headers: HEADERS,
          body: JSON.stringify({
            error: "GEMINI_API_KEY missing in Netlify environment",
            hint: "Set Site settings → Environment variables → GEMINI_API_KEY and PROVIDER=gemini, then redeploy."
          })
        };
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
      const body = { contents: [{ role: "user", parts: [{ text: augmented }] }] };

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        const errTxt = await r.text().catch(() => "");
        return { statusCode: r.status, headers: HEADERS, body: JSON.stringify({ error: "Gemini API error", detail: errTxt }) };
      }

      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.text || "";

      return {
        statusCode: 200,
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "gemini", text })
      };
    }

    // ─────────────────────────── COHERE ───────────────────────────
    if (PROVIDER === "cohere") {
      const key = process.env.COHERE_API_KEY;
      if (!key) {
        return {
          statusCode: 500,
          headers: HEADERS,
          body: JSON.stringify({
            error: "COHERE_API_KEY missing in Netlify environment",
            hint: "Set Site settings → Environment variables → COHERE_API_KEY and PROVIDER=cohere, then redeploy."
          })
        };
      }

      const url = "https://api.cohere.com/v1/chat";
      const body = {
        model: "command-r+",
        messages: [
          { role: "system", content: baseSystem },
          { role: "user", content: ctx + prompt }
        ],
        temperature: 0.4
      };

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        const errTxt = await r.text().catch(() => "");
        return { statusCode: r.status, headers: HEADERS, body: JSON.stringify({ error: "Cohere API error", detail: errTxt }) };
      }

      const data = await r.json();
      const text = data?.text || data?.message?.content?.[0]?.text || "";

      return {
        statusCode: 200,
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "cohere", text })
      };
    }

    // Unknown provider
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: `Unknown PROVIDER: ${PROVIDER}` }) };

  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: String(err) }) };
  }
};
