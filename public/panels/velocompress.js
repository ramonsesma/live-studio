// Rich panel: Velocity Compressor — velocity histogram + downward compression with a live
// transfer curve. Demo computes a histogram offline so it previews without Live.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.velocompress = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>📊 Velocity Compressor</h1><p>Treats a clip's note velocities like an audio signal — histogram, downward compression above a threshold, makeup gain, written back in place.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="vc-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Clip</label><input id="vc-clip" type="number" value="0" style="width:50px" />
      <label class="hint">Threshold</label><input id="vc-th" type="number" value="90" style="width:56px" />
      <label class="hint">Ratio</label><input id="vc-ratio" type="number" value="2" step="0.5" style="width:56px" />
      <label class="hint">Makeup</label><input id="vc-mk" type="number" value="0" style="width:56px" />
      <button class="btn" id="vc-an">Analyze</button>
      <button class="btn" id="vc-go"><i class="ti ti-arrows-minimize" aria-hidden="true"></i> Compress</button>
      <span class="hint" id="vc-info"></span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px">
      <div><div class="hint" style="margin-bottom:4px">Distribution</div><div id="vc-hist"></div></div>
      <div><div class="hint" style="margin-bottom:4px">Transfer curve</div><div id="vc-curve"></div></div>
    </div>`;

  function hist(bins) {
    const max = Math.max(1, ...bins.map((b) => b.count)), W = 320, H = 130;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:6px">`;
    bins.forEach((b, i) => { const h = (b.count / max) * (H - 18), x = (i / bins.length) * W; r += `<rect x="${x + 1}" y="${H - 14 - h}" width="${W / bins.length - 2}" height="${h}" rx="1.5" fill="#4ea1ff" opacity="0.85" />`; });
    return r + `<line x1="0" y1="${H - 14}" x2="${W}" y2="${H - 14}" stroke="#2f2f36" /><text x="2" y="${H - 3}" fill="#6b6b73" font-size="8">0</text><text x="${W - 18}" y="${H - 3}" fill="#6b6b73" font-size="8">127</text></svg>`;
  }
  function curve(th, ratio, makeup) {
    const W = 320, H = 130, m = (v) => { let o = v > th ? th + (v - th) / ratio : v; return Math.max(1, Math.min(127, o + makeup)); };
    let d = "";
    for (let v = 0; v <= 127; v += 2) { const x = (v / 127) * W, y = H - 10 - (m(v) / 127) * (H - 20); d += `${v === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `; }
    const tx = (th / 127) * W;
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:6px"><line x1="0" y1="${H - 10}" x2="${W}" y2="10" stroke="#2f2f36" stroke-dasharray="3 3" /><line x1="${tx}" y1="0" x2="${tx}" y2="${H}" stroke="#ff8c0055" /><path d="${d}" fill="none" stroke="#5ad17a" stroke-width="2" /></svg>`;
  }
  function redrawCurve() { panel.querySelector("#vc-curve").innerHTML = curve(Number(panel.querySelector("#vc-th").value), Math.max(1, Number(panel.querySelector("#vc-ratio").value)), Number(panel.querySelector("#vc-mk").value)); }

  async function analyze() {
    const r = await exec("analyze", { track_index: +panel.querySelector("#vc-trk").value, clip_index: +panel.querySelector("#vc-clip").value });
    if (r.success) { panel.querySelector("#vc-hist").innerHTML = hist(r.data.histogram); panel.querySelector("#vc-info").textContent = `${r.data.count} notes · mean ${r.data.mean} · ${r.data.min}–${r.data.max}`; } else demo();
  }
  async function compress() {
    const r = await exec("compress", { track_index: +panel.querySelector("#vc-trk").value, clip_index: +panel.querySelector("#vc-clip").value, threshold: +panel.querySelector("#vc-th").value, ratio: +panel.querySelector("#vc-ratio").value, makeup: +panel.querySelector("#vc-mk").value });
    if (r.success) { panel.querySelector("#vc-hist").innerHTML = hist(r.data.histogramAfter); panel.querySelector("#vc-info").textContent = `compressed ${r.data.noteCount} notes · mean ${r.data.before.mean}→${r.data.after.mean}`; } else demo();
  }
  function demo() {
    const bins = Array.from({ length: 16 }, (_, i) => ({ from: i * 8, to: i * 8 + 7, count: Math.round(40 * Math.exp(-Math.pow(i - 12, 2) / 8)) }));
    panel.querySelector("#vc-hist").innerHTML = hist(bins); panel.querySelector("#vc-info").textContent = "Demo (offline) — sample distribution";
  }
  panel.querySelector("#vc-an").onclick = analyze;
  panel.querySelector("#vc-go").onclick = compress;
  ["vc-th", "vc-ratio", "vc-mk"].forEach((id) => panel.querySelector("#" + id).oninput = redrawCurve);
  demo(); redrawCurve();
};
