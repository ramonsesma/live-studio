window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.acid303 = function (panel, helpers) {
  const api = helpers.api;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const noteOpts = (sel) => { let o = ""; for (let m = 24; m <= 48; m++) o += `<option value="${m}"${m === sel ? " selected" : ""}>${NN[m % 12]}${Math.floor(m / 12) - 1}</option>`; return o; };
  const PARAMS = [["bpm","BPM",60,200,1,130],["bars","Bars",1,4,1,1],["cutoff","Cutoff",100,4000,50,800],["reso","Reso",0,0.95,0.05,0.7],["envMod","Env mod",0,100,5,60],["decay","Decay",0.03,0.6,0.01,0.18],["accent","Accent",0,1,0.05,0.6],["drive","Drive",0,1,0.05,0.5]];
  let lastAudio = null;
  panel.innerHTML = `
    <div class="panel-head"><h1>🧪 Acid Engine</h1><p>Synthesize a TB-303-style acid line in-host — resonant saw with per-note filter envelope, accent and slide — then audition and import.</p></div>
    <div class="ss-toolbar"><label class="hint">Root</label><select id="ac-note">${noteOpts(36)}</select>
      <button class="btn" id="ac-go"><i class="ti ti-wave-saw-tool" aria-hidden="true"></i> Synthesize &amp; import</button>
      <button class="btn ghost" id="ac-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button><span class="hint" id="ac-info"></span></div>
    <div id="ac-params" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 16px;margin-top:12px"></div>
    <div id="ac-wave" style="margin-top:12px"></div><audio id="ac-audio" style="display:none"></audio>`;
  panel.querySelector("#ac-params").innerHTML = PARAMS.map(([k, label, min, max, step, def]) => `<div style="display:flex;align-items:center;gap:8px"><label class="hint" style="width:70px">${label}</label><input class="ac-p" data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${def}" style="flex:1" /><span class="hint ac-pv" style="width:44px;text-align:right">${def}</span></div>`).join("");
  panel.querySelectorAll(".ac-p").forEach((s) => s.oninput = (e) => e.target.parentElement.querySelector(".ac-pv").textContent = e.target.value);
  function params() { const p = { note: +panel.querySelector("#ac-note").value }; panel.querySelectorAll(".ac-p").forEach((s) => p[s.dataset.k] = +s.value); return p; }
  function wave(peaks) { if (!peaks || !peaks.length) return ""; const W = 640, H = 90, mid = H / 2, bw = (W - 4) / peaks.length; let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`; peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="#e8617a" opacity="0.85"/>`; }); return r + `</svg>`; }
  async function synth(demo) { panel.querySelector("#ac-info").textContent = "Synthesizing…"; const r = await api.post("/api/acid", { params: params(), import: !demo, demo: !!demo }); if (!r.success) { if (!demo) return synth(true); panel.querySelector("#ac-info").textContent = r.error || "Failed"; return; } lastAudio = r.data.audio; panel.querySelector("#ac-wave").innerHTML = wave(r.data.wave); panel.querySelector("#ac-info").textContent = `${r.data.bars} bar · ${r.data.durSec}s${r.data.importedPath ? " · imported" : ""}`; }
  async function audition() { if (!lastAudio) await synth(true); if (!lastAudio) return; const a = panel.querySelector("#ac-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {}); }
  panel.querySelector("#ac-go").onclick = () => synth(false); panel.querySelector("#ac-aud").onclick = audition; synth(true);
};
