// Rich panel: Auto-Gain Stager — measures real RMS/peak per audio track (render→FFT via
// /api/autogain) and sets each fader to a reference level. Demo mode proves the UI offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.autogain = function (panel, helpers) {
  const api = helpers.api;
  const gain = (body) => api.post("/api/autogain", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>📏 Auto-Gain Stager</h1><p>Measures real RMS/peak per audio stem and sets each fader to a reference. Render-based, in-host.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="ag-an"><i class="ti ti-wave-sine" aria-hidden="true"></i> Analyze</button>
      <label class="hint">Reference</label>
      <select id="ag-mode"><option value="average">match average</option><option value="-18">-18 dBFS</option><option value="-12">-12 dBFS</option><option value="loudest">loudest</option><option value="quietest">quietest</option></select>
      <button class="btn ghost" id="ag-apply">Apply faders</button>
      <span class="hint" id="ag-info">Press Analyze (renders audio tracks) or shows Demo.</span>
    </div>
    <div id="ag-rows" style="margin-top:8px"></div>`;

  let last = null;
  // dBFS in [-48,0] → bar fraction
  const frac = (db) => Math.max(0, Math.min(1, (db + 48) / 48));

  function render(data) {
    last = data;
    const rows = data.tracks || [];
    panel.querySelector("#ag-info").textContent = `${rows.length} stems · target ${data.targetDb} dBFS (${data.targetMode})${data.applied ? " · ✓ applied" : ""}`;
    const tgt = frac(data.targetDb) * 100;
    const box = panel.querySelector("#ag-rows");
    box.innerHTML = "";
    rows.forEach((r) => {
      const p = frac(r.rmsDb), pk = frac(r.peakDb);
      const move = r.faderDb > 0.05 ? `+${r.faderDb}` : r.faderDb < -0.05 ? `${r.faderDb}` : "0";
      const moveCol = r.faderDb > 0.05 ? "#5ad17a" : r.faderDb < -0.05 ? "#e24b4a" : "#9a9aa2";
      const row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:96px 1fr 76px 70px;gap:10px;align-items:center;padding:6px 4px";
      row.innerHTML = `
        <span style="color:#e8e8ea;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name}</span>
        <span style="position:relative;height:16px;background:#202026;border:1px solid #34343b;border-radius:7px;overflow:hidden;display:block">
          <span style="display:block;height:100%;width:${(p * 100).toFixed(0)}%;background:${p > 0.85 ? "#e24b4a" : p > 0.7 ? "#ffb347" : "#5ad17a"}"></span>
          <span style="position:absolute;top:0;bottom:0;left:${pk * 100}%;width:2px;background:#e8e8ea" title="peak ${r.peakDb} dB"></span>
          <span style="position:absolute;top:-2px;bottom:-2px;left:${tgt}%;width:2px;background:#6cc6ff" title="target ${data.targetDb} dB"></span>
        </span>
        <span class="hint" style="font-size:11px;text-align:right">${r.rmsDb} dB</span>
        <span style="font-size:12px;text-align:right;color:${moveCol}"><i class="ti ti-arrows-vertical" aria-hidden="true"></i> ${move} dB</span>`;
      box.appendChild(row);
    });
    box.insertAdjacentHTML("beforeend", `<div class="hint" style="font-size:11px;margin-top:8px"><span style="color:#6cc6ff">▏</span> target · <span style="color:#e8e8ea">▏</span> peak · measurement exact, fader move estimated from Live's volume curve.</div>`);
  }

  async function analyze() {
    panel.querySelector("#ag-info").textContent = "Rendering & measuring stems…";
    const r = await gain({ targetMode: panel.querySelector("#ag-mode").value });
    if (!r.success) { panel.querySelector("#ag-info").textContent = r.error + " — showing Demo."; return demo(); }
    render(r.data);
  }
  async function demo() {
    const r = await gain({ demo: true, targetMode: panel.querySelector("#ag-mode").value });
    if (r.success) { render(r.data); panel.querySelector("#ag-info").textContent = `Demo · target ${r.data.targetDb} dBFS (${r.data.targetMode})`; }
  }
  panel.querySelector("#ag-an").onclick = analyze;
  panel.querySelector("#ag-mode").onchange = () => (last && !last.applied ? analyze().catch(demo) : demo());
  panel.querySelector("#ag-apply").onclick = async () => {
    const r = await gain({ targetMode: panel.querySelector("#ag-mode").value, apply: true });
    if (r.success && r.data.applied) render(r.data);
    else panel.querySelector("#ag-info").textContent = (r.error || "Apply needs Live with audio tracks.");
  };
  demo();
};
