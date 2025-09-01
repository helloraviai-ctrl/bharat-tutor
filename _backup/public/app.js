import { marked } from "https://cdn.jsdelivr.net/npm/marked/+esm";


try {
const r = await fetch("/.netlify/functions/chat",{
method:'POST', headers:{'Content-Type':'application/json'},
body: JSON.stringify({ prompt, system: sys, context: ctx })
});
const data = await r.json();
const text = data.text || JSON.stringify(data);
// replace last assistant '…' with response
history = history.map(m=> m.content==='…' && m.role==='assistant' ? { ...m, content: text } : m);
render();
if(ttsChk.checked) speakBest(text);
} catch (e) {
history = history.map(m=> m.content==='…' && m.role==='assistant' ? { ...m, content: `Error: ${String(e)}` } : m);
render();
}
}


sendBtn.addEventListener('click', send);
promptEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } });


// ── Speech Synthesis (TTS) ───────────────────────────────────────────────────
let voices = [];
function loadVoices(){
voices = window.speechSynthesis.getVoices();
voiceSel.innerHTML = '';
const opts = voices
.filter(v=> /hi|India|हिन्दी|Hindi/i.test(`${v.lang} ${v.name}`) || /Google|Microsoft|Natural/i.test(v.name))
.concat(voices.filter(v=>!(/hi|India|हिन्दी|Hindi/i.test(`${v.lang} ${v.name}`))))
.reduce((acc,v)=> { if(!acc.find(x=>x.name===v.name)) acc.push(v); return acc; }, []);
for(const v of opts){
const opt = document.createElement('option');
opt.value = v.name; opt.textContent = `${v.name} — ${v.lang}`;
voiceSel.appendChild(opt);
}
// Try to select a Hindi voice by default
const defaultHindi = opts.find(v=> /hi-IN|Hindi|हिन्दी/i.test(`${v.lang} ${v.name}`));
if(defaultHindi) voiceSel.value = defaultHindi.name;
}
if('speechSynthesis' in window){
loadVoices();
window.speechSynthesis.onvoiceschanged = loadVoices;
}


function speakBest(text){
if(!('speechSynthesis' in window)) return;
const u = new SpeechSynthesisUtterance(text.replace(/\*|#/g,''));
const pick = voices.find(v=> v.name === voiceSel.value) || voices.find(v=> /hi-IN/i.test(v.lang)) || voices[0];
if(pick){ u.voice = pick; u.lang = pick.lang; }
u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
window.speechSynthesis.cancel();
window.speechSynthesis.speak(u);
}


// ── Speech Recognition (STT) ────────────────────────────────────────────────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = SR ? new SR() : null;
if(rec){ rec.lang = 'hi-IN'; rec.interimResults = false; rec.maxAlternatives = 1; }
let recOn = false;
micBtn.addEventListener('click', ()=>{
if(!rec){ alert('Speech recognition not supported in this browser.'); return; }
if(recOn){ rec.stop(); recOn=false; micBtn.textContent='🎤'; return; }
recOn=true; micBtn.textContent='⏺'; rec.start();
});
if(rec){
rec.onresult = (e)=>{ const t = e.results[0][0].transcript; promptEl.value = (promptEl.value+" "+t).trim(); };
rec.onend = ()=>{ recOn=false; micBtn.textContent='🎤'; };
}


// Initial render
render();