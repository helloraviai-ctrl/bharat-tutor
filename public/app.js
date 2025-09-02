// public/app.js
import { marked } from "https://cdn.jsdelivr.net/npm/marked/+esm";

const $ = (s) => document.querySelector(s);

// UI elements
const messages = $("#messages");
const promptEl = $("#prompt");
const contextEl = $("#context");
const sendBtn = $("#send");
const micBtn = $("#mic");
const voiceSel = $("#voice");
const tts = $("#tts");

// ── Chat memory (client-side). We'll include last N turns in the prompt we send.
let history = []; // [{role:'user'|'assistant', content:string}]

// Render a chat bubble with Markdown + MathJax
function bubble(role, md) {
  const d = document.createElement("div");
  d.className = `msg ${role === "user" ? "user" : "bot"}`;

  const roleEl = document.createElement("div");
  roleEl.className = "role";
  roleEl.textContent = role === "user" ? "You" : "Tutor";

  const body = document.createElement("div");
  // Render markdown to HTML
  body.innerHTML = marked.parse(md || "");

  d.appendChild(roleEl);
  d.appendChild(body);
  return d;
}

function render() {
  messages.innerHTML = "";
  for (const m of history.slice(-30)) {
    messages.appendChild(bubble(m.role, m.content));
  }
  messages.scrollTop = messages.scrollHeight;
  // Typeset math after DOM updates
  window.MathJax?.typesetPromise?.();
}

function push(role, content) {
  history.push({ role, content });
  render();
}

// Build a compact conversation context (last 6 turns) to send with the prompt
function buildConversationContext(latestUserPrompt) {
  const turns = history.slice(-6);
  const lines = [];
  for (const t of turns) {
    if (!t.content) continue;
    const prefix = t.role === "user" ? "User:" : "Tutor:";
    // strip extra whitespace
    lines.push(`${prefix} ${t.content}`.trim());
  }
  lines.push(`User: ${latestUserPrompt}`);
  return lines.join("\n\n");
}

async function send() {
  const userPrompt = (promptEl.value || "").trim();
  if (!userPrompt) return;

  // Push user bubble now
  push("user", userPrompt);
  promptEl.value = "";

  // Show placeholder assistant bubble
  push("assistant", "…");

  // Compose context block for server — we pack chat memory into Context:
  const chatMemory = buildConversationContext(userPrompt);
  const ctxCombined = [contextEl.value?.trim(), chatMemory]
    .filter(Boolean)
    .join("\n\n---\n\n");

  try {
    const r = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: userPrompt,
        context: `Previous conversation (summarized):\n${chatMemory}\n\n` +
                 (contextEl.value?.trim() ? `Extra notes:\n${contextEl.value.trim()}\n` : "")
      }),
    });

    if (!r.ok) {
      const errTxt = await r.text().catch(() => "");
      throw new Error(`API ${r.status}: ${errTxt}`);
    }

    const data = await r.json();
    const text = data.text || JSON.stringify(data, null, 2);

    // Replace the "…" bubble with the real text
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

// ── TTS (speak toggle controls it)
let voices = [];
function loadVoices() {
  voices = window.speechSynthesis?.getVoices?.() || [];
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
  window.speechSynthesis.onvoiceschanged = loadVoices;
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
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ── Mic / Speech-to-Text (works on HTTPS / Netlify)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = SR ? new SR() : null;
let recOn = false;
if (rec) {
  rec.lang = "hi-IN";       // You can change to "en-IN" if you prefer
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = (e) => {
    const t = e.results?.[0]?.[0]?.transcript || "";
    if (t) {
      // Put transcript into the prompt input
      promptEl.value = (promptEl.value + " " + t).trim();
    }
  };
  rec.onend = () => {
    recOn = false;
    micBtn.textContent = "🎤";
  };
}

micBtn.addEventListener("click", () => {
  if (!rec) {
    alert("Speech recognition not supported in this browser.");
    return;
  }
  if (recOn) {
    rec.stop();
    recOn = false;
    micBtn.textContent = "🎤";
  } else {
    recOn = true;
    micBtn.textContent = "⏺";
    try {
      rec.start();
    } catch {
      // Some engines throw if called too quickly
    }
  }
});

// Initial render
render();
