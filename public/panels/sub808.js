// Rich panel: 808 Engine — synthesize a tuned 808/sub, preview its waveform, audition it and
// import as a new clip. Works offline (the local server renders + serves the WAV).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.sub808 = function (panel, helpers) {
  const api = helpers.api;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const noteOpts = (sel) => { let o = ""; for (let m = 12; m <= 48; m++) o += `<option value="${m}"${m === sel ? " selected" : ""}>${NN[m % 12]}${Math.floor(m / 12) - 1} · ${(440 * Math.pow(2, (m - 69) / 12)).toFixed(1)}Hz</option>`; return o; };
  const PARAMS = [["glide","Glide (st)",0,24,1,12],["glideTime","Glide time",0.005,0.2,0.005,0.04],["decay","Decay",0.1,2,0.05,0.8],["drive","Drive",0,1,0.05,0.4],["click","Click",0,1,0.05,0.3]];
  let lastAudio = null;

  panel.innerHTML = `
    <div class="panel-head"><h1>🔊 808 Engine</h1><p>Synthesize a tuned 808 / sub-bass in-host — pitch glide, long decay and saturation — then audition and import it as a new clip.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Note</label><select id="e8-note">${noteOpts(24)}</select>
      <button class="btn" id="e8-go"><i class="ti ti-wave-sine" aria-hidden="true"></i> Synthesize &amp; import</button>
      <button class="btn ghost" id="e8-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button>
      <span class="hint" id="e8-info"></span>
    </div>
    <div id="e8-params" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 16px;margin-top:12px"></div>
    <div id="e8-wave" style="margin-top:12px"></div>
    <audio id="e8-audio" style="display:none"></audio>`;

  panel.querySelector("#e8-params").innerHTML = PARAMS.map(([k, label, min, max, step, def]) =>
    `<div style="display:flex;align-items:center;gap:8px"><label class="hint" style="width:80px">${label}</label><input class="e8-p" data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${def}" style="flex:1" /><span class="hint e8-pv" style="width:48px;text-align:right">${def}</span></div>`).join("");
  panel.querySelectorAll(".e8-p").forEach((s) => s.oninput = (e) => e.target.parentElement.querySelector(".e8-pv").textContent = e.target.value);

  function params() { const p = { note: +panel.querySelector("#e8-note").value }; panel.querySelectorAll(".e8-p").forEach((s) => p[s.dataset.k] = +s.value); return p; }
  function wave(peaks) {
    if (!peaks || !peaks.length) return "";
    const W = 640, H = 90, mid = H / 2, bw = (W - 4) / peaks.length;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`;
    peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="#e0a23a" opacity="0.88"/>`; });
    return r + `</svg>`;
  }
  async function synth(demo) {
    panel.querySelector("#e8-info").textContent = "Synthesizing…";
    const r = await api.post("/api/sub808", { params: params(), import: !demo, demo: !!demo });
    if (!r.success) { if (!demo) return synth(true); panel.querySelector("#e8-info").textContent = r.error || "Failed"; return; }
    lastAudio = r.data.audio;
    panel.querySelector("#e8-wave").innerHTML = wave(r.data.wave);
    const n = +panel.querySelector("#e8-note").value;
    panel.querySelector("#e8-info").textContent = `${NN[n % 12]}${Math.floor(n / 12) - 1} · ${r.data.durSec}s${r.data.importedPath ? " · imported" : ""}`;
  }
  async function audition() { if (!lastAudio) await synth(true); if (!lastAudio) return; const a = panel.querySelector("#e8-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {}); }
  panel.querySelector("#e8-go").onclick = () => synth(false);
  panel.querySelector("#e8-aud").onclick = audition;
  synth(true);
};
