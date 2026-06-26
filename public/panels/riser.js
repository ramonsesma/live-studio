// Rich panel: Riser — synthesize a riser / sweep / downlifter, preview the waveform, audition it
// and import as a new clip. Works offline (the local server renders + serves the WAV).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.riser = function (panel, helpers) {
  const api = helpers.api;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const noteOpts = (sel) => { let o = ""; for (let m = 24; m <= 96; m += 1) o += `<option value="${m}"${m === sel ? " selected" : ""}>${NN[m % 12]}${Math.floor(m / 12) - 1}</option>`; return o; };
  let lastAudio = null;

  panel.innerHTML = `
    <div class="panel-head"><h1>🚀 Riser</h1><p>Synthesize risers, sweeps and downlifters in-host — noise + oscillator, pitch sweep, moving filter, fades and FX — then import as a new clip.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Source</label><select id="ri-src"><option value="mix" selected>Mix</option><option value="noise">Noise</option><option value="osc">Osc</option></select>
      <label class="hint">Noise</label><select id="ri-noise"><option>white</option><option selected>pink</option><option>brown</option></select>
      <label class="hint">Wave</label><select id="ri-wave"><option selected>saw</option><option>sine</option><option>square</option></select>
      <label class="hint">Length</label><input id="ri-len" type="number" value="3" step="0.5" style="width:54px" />s
    </div>
    <div class="ss-toolbar" style="margin-top:8px">
      <label class="hint">Pitch</label><select id="ri-n0">${noteOpts(45)}</select><span class="hint">→</span><select id="ri-n1">${noteOpts(69)}</select>
      <label class="hint">Filter</label><select id="ri-filt"><option value="lp" selected>LP</option><option value="bp">BP</option><option value="hp">HP</option><option value="none">None</option></select>
      <select id="ri-fdir"><option value="up" selected>up</option><option value="down">down</option></select>
    </div>
    <div class="ss-toolbar" style="margin-top:8px">
      <label class="hint">Volume</label><select id="ri-vol"><option value="up" selected>fade up</option><option value="down">fade down</option><option value="const">const</option></select>
      <label class="hint">Movement</label><select id="ri-mv"><option>off</option><option selected>gentle</option><option>medium</option><option>extreme</option></select>
      <label class="hint">Drive</label><input id="ri-drive" type="number" value="0.2" step="0.1" style="width:50px" />
      <label class="hint">FX</label><select id="ri-fx"><option>none</option><option>phaser</option><option selected>flanger</option><option>chorus</option></select>
      <button class="btn" id="ri-go"><i class="ti ti-arrow-up-right" aria-hidden="true"></i> Synthesize &amp; import</button>
      <button class="btn ghost" id="ri-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button>
      <span class="hint" id="ri-info"></span>
    </div>
    <div id="ri-wave" style="margin-top:12px"></div>
    <audio id="ri-audio" style="display:none"></audio>`;

  function wave(peaks) {
    if (!peaks || !peaks.length) return "";
    const W = 640, H = 90, mid = H / 2, bw = (W - 4) / peaks.length;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`;
    peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="#9d8cff" opacity="0.88"/>`; });
    return r + `</svg>`;
  }
  function params() { return { source: panel.querySelector("#ri-src").value, noise: panel.querySelector("#ri-noise").value, wave: panel.querySelector("#ri-wave").value, length: +panel.querySelector("#ri-len").value, startNote: +panel.querySelector("#ri-n0").value, endNote: +panel.querySelector("#ri-n1").value, filter: panel.querySelector("#ri-filt").value, filterDir: panel.querySelector("#ri-fdir").value, volume: panel.querySelector("#ri-vol").value, movement: panel.querySelector("#ri-mv").value, drive: +panel.querySelector("#ri-drive").value, fx: panel.querySelector("#ri-fx").value }; }
  async function synth(demo) {
    panel.querySelector("#ri-info").textContent = "Synthesizing…";
    const r = await api.post("/api/riser", { params: params(), import: !demo, demo: !!demo });
    if (!r.success) { if (!demo) return synth(true); panel.querySelector("#ri-info").textContent = r.error || "Failed"; return; }
    lastAudio = r.data.audio;
    panel.querySelector("#ri-wave").innerHTML = wave(r.data.wave);
    panel.querySelector("#ri-info").textContent = `${r.data.durSec}s${r.data.importedPath ? " · imported" : ""}`;
  }
  async function audition() { if (!lastAudio) await synth(true); if (!lastAudio) return; const a = panel.querySelector("#ri-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {}); }
  panel.querySelector("#ri-go").onclick = () => synth(false);
  panel.querySelector("#ri-aud").onclick = audition;
  synth(true);
};
