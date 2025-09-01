const $ = s=>document.querySelector(s);
const messages=$("#messages"), promptEl=$("#prompt"), systemEl=$("#system"), contextEl=$("#context");
const sendBtn=$("#send"), micBtn=$("#mic"), voiceSel=$("#voice"); const tts=$("#tts");

const DEFAULT_SYSTEM = "You are Bharat Tutor. First respond in clear, simple Hindi. Then add a 2-line English summary. Use concise, step-by-step reasoning for math and science. If there is a section starting with 'Context:' above, rely on it strongly. If not enough info, ask one short follow-up question. Keep answers to 8 bullets or fewer.";
systemEl.value = DEFAULT_SYSTEM;

let history=[];
function push(role, content){ history.push({role,content}); render(); }
function bubble(role, text){
  const d=document.createElement("div");
  d.className = `msg ${role==='user'?'user':'bot'}`;
  d.innerHTML = `<div class="role" style="opacity:.7;font-size:12px;margin-bottom:4px">${role==='user'?'आप':'ट्यूटर'}</div><div>${(text||'').replaceAll('<','&lt;')}</div>`;
  return d;
}
function render(){ messages.innerHTML=""; for(const m of history.slice(-30)) messages.appendChild(bubble(m.role,m.content)); messages.scrollTop=messages.scrollHeight; }

async function send(){
  const prompt = (promptEl.value||"").trim(); if(!prompt) return;
  push("user", prompt); promptEl.value="";
  push("assistant","…");
  try{
    const r = await fetch("/.netlify/functions/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ prompt, system: systemEl.value.trim(), context: contextEl.value.trim() })
    });
    const data = await r.json();
    const text = data.text || JSON.stringify(data,null,2);
    const idx = history.findIndex(m=>m.role==="assistant" && m.content==="…");
    if(idx>-1) history[idx].content = text;
    render();
    if(tts.checked) speak(text);
  }catch(e){
    const idx = history.findIndex(m=>m.role==="assistant" && m.content==="…");
    if(idx>-1) history[idx].content = "Error: "+String(e);
    render();
  }
}

sendBtn.addEventListener("click", send);
promptEl.addEventListener("keydown", e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }});

// TTS
let voices=[];
function loadVoices(){
  voices = speechSynthesis.getVoices();
  voiceSel.innerHTML="";
  voices.forEach(v=>{ const o=document.createElement("option"); o.value=v.name; o.textContent=`${v.name} — ${v.lang}`; voiceSel.appendChild(o); });
  const hi = voices.find(v=>/hi-IN|Hindi|हिन्दी/i.test(`${v.lang} ${v.name}`));
  if(hi) voiceSel.value = hi.name;
}
if("speechSynthesis" in window){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(text){
  if(!("speechSynthesis" in window)) return;
  const u=new SpeechSynthesisUtterance((text||"").replace(/\*|#/g,""));
  const pick = voices.find(v=>v.name===voiceSel.value) || voices.find(v=>/hi-IN/i.test(v.lang)) || voices[0];
  if(pick){ u.voice=pick; u.lang=pick.lang; } u.rate=1; u.pitch=1; u.volume=1; speechSynthesis.cancel(); speechSynthesis.speak(u);
}

// (Optional) simple mic—enable later if needed
