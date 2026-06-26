// Rich panel: Quantize & Swing — snap timing to a grid (with strength + swing) and apply swing
// presets, shown as a before→after piano roll. Preview mirrors the math; the same op runs on
// your selected Live clip (undoable via Edit History).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.quantizer = function (panel, helpers) {
  const exec = helpers.execute;
  const GRID = { "1/4": 1, "1/8": 0.5, "1/8t": 1 / 3, "1/16": 0.25, "1/16t": 1 / 6, "1/32": 0.125 };
  const SWING = { "hip-hop": 0.62, house: 0.56, latin: 0.6, shuffle: 0.66, jazz: 0.64 };
  const demo = () => Array.from({ length: 16 }, (_, i) => ({ pitch: 60, startTime: i * 0.25 + (Math.random() * 2 - 1) * 0.05, duration: 0.2, velocity: i % 4 === 0 ? 110 : 80 }));
  let work = demo(), base = [];

  panel.innerHTML = `
    <div class="panel-head"><h1>🎯 Quantize & Swing</h1><p>Snap timing to a grid with strength + swing, or apply a swing preset. Before→after preview; the same op runs on your selected clip.</p></div>
    <div class="ss-toolbar"><label class="hint">Track</label><input id="q-trk" type="number" value="0" style="width:46px" /><label class="hint">Clip</label><input id="q-clip" type="number" value="0" style="width:46px" /><button class="btn ghost" id="q-reset"><i class="ti ti-refresh" aria-hidden="true"></i> Reset</button><span class="hint" id="q-info">preview = humanized 16ths</span></div>
    <div id="q-roll" style="margin-top:10px"></div>
    <div class="ss-toolbar" style="margin-top:12px"><label class="hint">Grid</label><select id="q-grid"><option>1/4</option><option>1/8</option><option>1/8t</option><option selected>1/16</option><option>1/16t</option><option>1/32</option></select><label class="hint">Strength</label><input id="q-str" type="range" min="0" max="100" value="100" /><span class="hint" id="q-strv">100</span><label class="hint">Swing</label><input id="q-sw" type="range" min="0" max="100" value="0" /><span class="hint" id="q-swv">0</span><button class="btn" id="q-go"><i class="ti ti-grid-dots" aria-hidden="true"></i> Quantize</button></div>
    <div class="ss-toolbar" style="margin-top:8px"><label class="hint">Swing preset</label><select id="q-preset"><option>hip-hop</option><option>house</option><option>latin</option><option>shuffle</option><option>jazz</option></select><button class="btn ghost" id="q-swgo"><i class="ti ti-wave-sine" aria-hidden="true"></i> Apply swing</button></div>`;

  function roll() {
    const all = base.concat(work); if (!all.length) return;
    const span = Math.max(...all.map((n) => n.startTime + n.duration), 4), W = 640, H = 80, gpx = 0.25;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px">`;
    for (let g = 0; g <= span; g += gpx) { const x = (g / span) * (W - 6) + 3; r += `<line x1="${x.toFixed(1)}" y1="6" x2="${x.toFixed(1)}" y2="${H - 6}" stroke="${Math.abs(g % 1) < 1e-6 ? "#2f2f3a" : "#1d1d24"}"/>`; }
    for (const n of base) { const x = (n.startTime / span) * (W - 6) + 3; r += `<rect x="${x.toFixed(1)}" y="46" width="${Math.max(4, (n.duration / span) * (W - 6)).toFixed(1)}" height="10" rx="2" fill="none" stroke="#4a4a55" stroke-dasharray="2 2"/>`; }
    for (const n of work) { const x = (n.startTime / span) * (W - 6) + 3, acc = n.velocity > 100; r += `<rect x="${x.toFixed(1)}" y="24" width="${Math.max(4, (n.duration / span) * (W - 6)).toFixed(1)}" height="10" rx="2" fill="${acc ? "#74b8e0" : "#4ea1ff"}" opacity="0.9"/>`; }
    r += `<text x="4" y="20" fill="#6b6b73" font-size="8">after</text><text x="4" y="${H - 24}" fill="#6b6b73" font-size="8">before</text>`;
    panel.querySelector("#q-roll").innerHTML = r + `</svg>`;
  }
  async function apply(fn, tool, args, label) {
    base = work.map((n) => ({ ...n })); work = fn(work.map((n) => ({ ...n }))); roll();
    const r = await exec(tool, Object.assign({ track_index: +panel.querySelector("#q-trk").value, clip_index: +panel.querySelector("#q-clip").value }, args));
    panel.querySelector("#q-info").textContent = `${label} · ${r.success ? "applied to clip" : "preview only (open a clip in Live)"}`;
  }
  panel.querySelector("#q-go").onclick = () => { const g = GRID[panel.querySelector("#q-grid").value], str = +panel.querySelector("#q-str").value / 100, sw = +panel.querySelector("#q-sw").value / 100; apply((ns) => ns.map((n) => { const idx = Math.round(n.startTime / g); let t = n.startTime + (idx * g - n.startTime) * str; if (idx % 2 === 1) t += g * 0.5 * sw; return { ...n, startTime: Math.max(0, t) }; }), "quantize", { grid: panel.querySelector("#q-grid").value, strength: +panel.querySelector("#q-str").value, swing: +panel.querySelector("#q-sw").value }, "Quantize"); };
  panel.querySelector("#q-swgo").onclick = () => { const p = panel.querySelector("#q-preset").value, ratio = SWING[p] || 0.6, g = 0.25; apply((ns) => ns.map((n) => { const idx = Math.round(n.startTime / g); return idx % 2 === 1 ? { ...n, startTime: n.startTime + g * (ratio - 0.5) * 2 } : n; }), "apply_swing", { preset: p }, `Swing ${p}`); };
  panel.querySelector("#q-str").oninput = (e) => (panel.querySelector("#q-strv").textContent = e.target.value);
  panel.querySelector("#q-sw").oninput = (e) => (panel.querySelector("#q-swv").textContent = e.target.value);
  panel.querySelector("#q-reset").onclick = () => { work = demo(); base = []; roll(); panel.querySelector("#q-info").textContent = "preview reset"; };
  roll();
};
