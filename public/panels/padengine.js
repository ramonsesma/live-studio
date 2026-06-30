// Rich panel: Pad Engine — synthesize an evolving pad/chord, preview waveform, audition, import.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.padengine = function (panel, helpers) {
  const api = helpers.api;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const noteOpts = (sel) => { let o = ""; for (let m = 36; m <= 72; m++) o += `<option value="${m}"${m === sel ? " selected" : ""}>${NN[m % 12]}${Math.floor(m / 12) - 1}</option>`; return o; };
  const PARAMS = [["voices","Voices",1,7,1,3],["detune","Detune",0,40,1,15],["cutoff","Cutoff",200,6000,50,1200],["lfoRate","LFO rate",0.05,2,0.05,0.2],["lfoDepth","LFO depth",0,100,5,40],["attack","Attack",0.05,5,0.05,0.8],["release","Release",0.1,8,0.1,1.5],["length","Length",1,12,0.5,4]];
  let lastAudio = null;

  panel.innerHTML = `
    <div class="panel-head"><h1>🌫️ Pad Engine</h1><p>Synthesize evolving pads in-host — a detuned-saw chord through a moving filter with chorus — then audition and import.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Root</label><select id="pd-note">${noteOpts(48)}</select>
      <label class="hint">Chord</label><select id="pd-chord"><option>single</option><option>maj</option><option>min</option><option>maj7</option><option selected>min7</option><option>sus2</option><option>sus4</option><option>min9</option></select>
      <button class="btn" id="pd-go"><i class="ti ti-cloud" aria-hidden="true"></i> Synthesize &amp; import</button>
      <button class="btn ghost" id="pd-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button>
      <span class="hint" id="pd-info"></span>
    </div>
    <div id="pd-params" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 16px;margin-top:12px"></div>
    <div id="pd-wave" style="margin-top:12px"></div>
    <audio id="pd-audio" style="display:none"></audio>`;

  panel.querySelector("#pd-params").innerHTML = PARAMS.map(([k, label, min, max, step, def]) =>
    `<div style="display:flex;align-items:center;gap:8px"><label class="hint" style="width:74px">${label}</label><input class="pd-p" data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${def}" style="flex:1" /><span class="hint pd-pv" style="width:44px;text-align:right">${def}</span></div>`).join("");
  panel.querySelectorAll(".pd-p").forEach((s) => s.oninput = (e) => e.target.parentElement.querySelector(".pd-pv").textContent = e.target.value);

  function params() { const p = { note: +panel.querySelector("#pd-note").value, chord: panel.querySelector("#pd-chord").value }; panel.querySelectorAll(".pd-p").forEach((s) => p[s.dataset.k] = +s.value); return p; }
  function wave(peaks) {
    if (!peaks || !peaks.length) return "";
    const W = 640, H = 90, mid = H / 2, bw = (W - 4) / peaks.length;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`;
    peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="#9d8cff" opacity="0.85"/>`; });
    return r + `</svg>`;
  }
  async function synth(demo) {
    panel.querySelector("#pd-info").textContent = "Synthesizing…";
    const r = await api.post("/api/pad", { params: params(), import: !demo, demo: !!demo });
    if (!r.success) { if (!demo) return synth(true); panel.querySelector("#pd-info").textContent = r.error || "Failed"; return; }
    lastAudio = r.data.audio; panel.querySelector("#pd-wave").innerHTML = wave(r.data.wave);
    const n = +panel.querySelector("#pd-note").value;
    panel.querySelector("#pd-info").textContent = `${NN[n % 12]}${Math.floor(n / 12) - 1} ${r.data.chord} · ${r.data.durSec}s${r.data.importedPath ? " · imported" : ""}`;
  }
  async function audition() { if (!lastAudio) await synth(true); if (!lastAudio) return; const a = panel.querySelector("#pd-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {}); }
  panel.querySelector("#pd-go").onclick = () => synth(false);
  panel.querySelector("#pd-aud").onclick = audition;
  synth(true);
};
