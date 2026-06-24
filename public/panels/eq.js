// Rich panel: EQ Curve — 5-band frequency response from the real apply_eq_preset tool,
// with suggest_eq markers overlaid. Visual where the autoform only showed preset names.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.eq = function (panel, helpers) {
  const exec = helpers.execute;
  const PRESETS = ["clean", "warm", "bright", "bass_cut", "treble_boost", "smile"];
  const FREQS = [60, 250, 1000, 4000, 12000];
  const FLAB = ["60", "250", "1k", "4k", "12k"];

  panel.innerHTML = `
    <div class="panel-head"><h1>📈 EQ Curve</h1><p>Apply a preset and see the 5-band response. "Suggest" overlays analysis points. Calls the real tool.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="eq-trk" type="number" min="0" value="0" style="width:54px" />
      <label class="hint">Preset</label>
      <select id="eq-preset">${PRESETS.map((p) => `<option value="${p}">${p}</option>`).join("")}</select>
      <button class="btn" id="eq-apply">Apply</button>
      <button class="btn ghost" id="eq-suggest">Suggest</button>
      <span class="hint" id="eq-info"></span>
    </div>
    <div id="eq-svg"></div>`;

  let values = { low: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 };
  let suggestions = [];

  function bandArr() { return [values.low, values.lowMid, values.mid, values.highMid, values.high]; }

  // Cosine interpolation between the 5 band gains across a log-frequency axis.
  function curvePoints(W, H, x0, x1, yMid, yScale) {
    const g = bandArr();
    const pts = [];
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bandPos = t * (g.length - 1);
      const a = Math.floor(bandPos), b = Math.min(a + 1, g.length - 1);
      const f = bandPos - a;
      const mu = (1 - Math.cos(f * Math.PI)) / 2;
      const gain = g[a] * (1 - mu) + g[b] * mu;
      const x = x0 + t * (x1 - x0);
      const y = yMid - gain * yScale;
      pts.push([x, y]);
    }
    return pts;
  }

  function draw() {
    const W = 760, H = 320, x0 = 46, x1 = 742, yMid = 165, yScale = 120 / 6; // ±6 dB
    const pts = curvePoints(W, H, x0, x1, yMid, yScale);
    const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const area = path + ` L${x1},${yMid} L${x0},${yMid} Z`;
    let grid = "";
    for (let db = -6; db <= 6; db += 3) {
      const y = yMid - db * yScale;
      grid += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#34343b" stroke-width="${db === 0 ? 1.5 : 1}" />
        <text x="8" y="${y + 4}" fill="#9a9aa2" font-size="11">${db > 0 ? "+" : ""}${db}</text>`;
    }
    let bands = "";
    FREQS.forEach((fz, i) => {
      const x = x0 + (i / (FREQS.length - 1)) * (x1 - x0);
      const y = yMid - bandArr()[i] * yScale;
      bands += `<line x1="${x}" y1="30" x2="${x}" y2="300" stroke="#2a2a30" stroke-width="1" />
        <circle cx="${x}" cy="${y}" r="6" fill="#ffb347" stroke="#1a1a1e" stroke-width="1.5" />
        <text x="${x}" y="314" fill="#9a9aa2" font-size="11" text-anchor="middle">${FLAB[i]}</text>`;
    });
    let sug = "";
    suggestions.forEach((s) => {
      // place by nearest log position between 20Hz..20kHz
      const lf = Math.log10(Math.max(20, s.freq));
      const t = (lf - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
      const x = x0 + Math.max(0, Math.min(1, t)) * (x1 - x0);
      const y = yMid - (s.gain || 0) * yScale;
      sug += `<g><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#6cc6ff" stroke-width="2" />
        <title>${s.band} · ${s.freq}Hz · ${s.gain > 0 ? "+" : ""}${s.gain}dB · ${s.reason || ""}</title></g>`;
    });
    panel.querySelector("#eq-svg").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#1a1a1e;border:1px solid #38383f;border-radius:10px">
        ${grid}${bands}
        <path d="${area}" fill="#ffb34722" />
        <path d="${path}" fill="none" stroke="#ffb347" stroke-width="2.5" />
        ${sug}
      </svg>`;
  }

  async function apply() {
    const track_index = Number(panel.querySelector("#eq-trk").value);
    const preset = panel.querySelector("#eq-preset").value;
    const r = await exec("apply_eq_preset", { track_index, preset, create_eq: false });
    if (!r.success) { panel.querySelector("#eq-info").textContent = r.error; return; }
    values = r.data.values || values;
    panel.querySelector("#eq-info").textContent = `${preset} applied → track ${track_index}`;
    draw();
  }
  async function suggest() {
    const track_index = Number(panel.querySelector("#eq-trk").value);
    const r = await exec("suggest_eq", { track_index });
    suggestions = r.success ? (r.data.suggestions || []) : [];
    panel.querySelector("#eq-info").textContent = `${suggestions.length} suggestions overlaid`;
    draw();
  }
  panel.querySelector("#eq-apply").onclick = apply;
  panel.querySelector("#eq-suggest").onclick = suggest;
  draw();
  apply();
};
