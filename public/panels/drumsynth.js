// Rich panel: Drum Synth — synthesize a kick/snare/clap/hat in-host, preview its waveform,
// audition it (plays the rendered WAV) and import it as a new clip. Works offline (the local
// server renders + serves the WAV); only the import step needs Live.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.drumsynth = function (panel, helpers) {
  const api = helpers.api;
  const PARAMS = {
    kick: [["tune","Tune",40,300,1,150],["pitchDecay","Pitch decay",0.005,0.2,0.005,0.045],["ampDecay","Amp decay",0.05,1.2,0.05,0.4],["click","Click",0,1,0.05,0.5],["sub","Sub",0,1,0.05,0.4],["drive","Drive",0,1,0.05,0.3]],
    snare: [["tone","Body",100,400,5,180],["decay","Noise decay",0.05,0.5,0.01,0.18],["bodyDecay","Body decay",0.03,0.3,0.01,0.1],["noise","Noise",0,1,0.05,0.6],["snappy","Snappy",0,1,0.05,0.5],["drive","Drive",0,1,0.05,0.2]],
    clap: [["bursts","Bursts",1,6,1,3],["spread","Spread (ms)",4,40,1,10],["tone","Tone",400,4000,50,1200],["bandwidth","Bandwidth",0.1,1,0.05,0.5]],
    hat: [["decay","Decay",0.02,0.6,0.01,0.06],["tone","HP tone",3000,12000,100,7000],["metallic","Metallic",0,1,0.05,0.4]],
  };
  const COL = { kick: "#e0a23a", snare: "#e8617a", clap: "#b58ce0", hat: "#57c7e0" };
  let lastAudio = null;

  panel.innerHTML = `
    <div class="panel-head"><h1>🥁 Drum Synth</h1><p>Synthesize kicks, snares, claps and hats in-host — audition them, then import as a new clip. No samples needed.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Type</label><select id="ds-type"><option value="kick">Kick</option><option value="snare">Snare</option><option value="clap">Clap</option><option value="hat">Hat</option></select>
      <label class="hint" id="ds-openw" style="display:none"><input type="checkbox" id="ds-open" /> open</label>
      <button class="btn" id="ds-go"><i class="ti ti-wave-square" aria-hidden="true"></i> Synthesize &amp; import</button>
      <button class="btn ghost" id="ds-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button>
      <span class="hint" id="ds-info"></span>
    </div>
    <div id="ds-params" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 16px;margin-top:12px"></div>
    <div id="ds-wave" style="margin-top:12px"></div>
    <audio id="ds-audio" style="display:none"></audio>`;

  function buildParams() {
    const type = panel.querySelector("#ds-type").value;
    panel.querySelector("#ds-openw").style.display = type === "hat" ? "" : "none";
    panel.querySelector("#ds-params").innerHTML = PARAMS[type].map(([k, label, min, max, step, def]) =>
      `<div style="display:flex;align-items:center;gap:8px"><label class="hint" style="width:84px">${label}</label><input class="ds-p" data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${def}" style="flex:1" /><span class="hint ds-pv" style="width:48px;text-align:right">${def}</span></div>`).join("");
    panel.querySelectorAll(".ds-p").forEach((s) => s.oninput = (e) => { e.target.parentElement.querySelector(".ds-pv").textContent = e.target.value; });
  }
  function collect() {
    const p = {};
    panel.querySelectorAll(".ds-p").forEach((s) => p[s.dataset.k] = +s.value);
    if (panel.querySelector("#ds-type").value === "hat") p.open = panel.querySelector("#ds-open").checked;
    return p;
  }
  function wave(peaks, color) {
    if (!peaks || !peaks.length) return "";
    const W = 640, H = 90, mid = H / 2, bw = (W - 4) / peaks.length;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`;
    peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.88"/>`; });
    return r + `</svg>`;
  }
  async function synth(demo) {
    panel.querySelector("#ds-info").textContent = "Synthesizing…";
    const type = panel.querySelector("#ds-type").value;
    const r = await api.post("/api/drumsynth", { type, params: collect(), import: !demo, demo: !!demo });
    if (!r.success) { panel.querySelector("#ds-info").textContent = r.error || "Failed"; return null; }
    lastAudio = r.data.audio;
    panel.querySelector("#ds-wave").innerHTML = wave(r.data.wave, COL[type]);
    panel.querySelector("#ds-info").textContent = `${type} · ${Math.round(r.data.durSec * 1000)} ms${r.data.importedPath ? " · imported" : ""}`;
    return r.data;
  }
  async function audition() {
    if (!lastAudio) { const d = await synth(true); if (!d) return; }
    const a = panel.querySelector("#ds-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {});
  }
  panel.querySelector("#ds-type").onchange = () => { buildParams(); lastAudio = null; synth(true); };
  panel.querySelector("#ds-go").onclick = () => synth(false);
  panel.querySelector("#ds-aud").onclick = audition;
  buildParams();
  synth(true);
};
