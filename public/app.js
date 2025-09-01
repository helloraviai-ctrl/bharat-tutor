// public/app.js (server-controlled system; no client "system" field)
const $ = (s) => document.querySelector(s);

// UI elements (no systemEl now)
const messages = $("#messages");
const promptEl = $("#prompt");
const contextEl = $("#context");
const sendBtn = $("#send");
const micBtn = $("#mic");        // kept for future STT
const voiceSel = $("#voice");
const tts = $("#tts");

let history = [];

function push(role, content) {
  history.push({ role, content });
  render();
}

function bubble(role, text) {
  const d = document.createElement("div");
  d.className = `msg ${role === "user" ? "user" : "bot"}`;
  d.innerHTML = `
    <div class="role" style="opacity:.7;font-size:12px;margin-bottom:4px">
      ${role === "user" ? "आप" : "ट्यूटर"}
    </div>
    <div>${(text || "").replaceAll("<", "&lt;")}</div>
  `;
  return d;
}

function render() {
  messages.innerHTML = "";
  for (const m of history.slice(-30)) messages.appendChild(bubble(m.role, m.content));
  messages.scrollTop = messages.scrollHeight;
}

async function send() {
  const prompt = (promptEl.value || "").trim();
  if (!prompt) return;

  push("user", prompt);
  promptEl.value = "";
  push("assistant", "…");

  try {
    const r = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 👇 send ONLY prompt + context (system is fixed on server)
      body: JSON.stringify({ prompt, context: (contextEl.value || "").trim() }),
    });

    if (!r.ok) {
      const errTxt = await r.text().catch(() => "");
      throw new Error(`API ${r.status}: ${errTxt}`);
    }

    const data = await r.json();
    const text = data.text || JSON.stringify(data, null, 2);

    const idx = history.findIndex((m) => m.role === "assistant" && m.content === "…");
    if (idx > -1) history[idx].content = text;
    render();

    if (tts?.checked) speak(text);
  } catch (e) {
    const idx = history.findIndex((m) => m.role === "assistant" && m.content === "…");
    if (idx > -1) history[idx].content = "Error: " + String(e.message || e);
    render();
  }
}

sendBtn.addEventListener("click", send);
promptEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

// ───────────── TTS (Text-to-Speech) ─────────────
let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices();
  voiceSel.innerHTML = "";
  voices.forEach((v) => {
    const o = document.createElement("option");
    o.value = v.name;
    o.textContent = `${v.name} — ${v.lang}`;
    voiceSel.appendChild(o);
  });
  const hi = voices.find((v) => /hi-IN|Hindi|हिन्दी/i.test(`${v.lang} ${v.name}`));
  if (hi) voiceSel.value = hi.name;
}
if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance((text || "").replace(/\*|#/g, ""));
  const pick =
    voices.find((v) => v.name === voiceSel.value) ||
    voices.find((v) => /hi-IN/i.test(v.lang)) ||
    voices[0];
  if (pick) {
    u.voice = pick;
    u.lang = pick.lang;
  }
  u.rate = 1;
  u.pitch = 1;
  u.volume = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// (Optional) mic / STT wiring can be added later if needed

