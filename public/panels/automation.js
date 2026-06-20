// Rich panel: Automation & Curves — SVG envelope curve.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.automation = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>📈 Automation & Curves</h1><p>Visualize a lane's envelope and apply smoothing or transformations.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="au-track" type="number" value="0" style="width:70px" />
      <label class="hint">Lane</label><select id="au-lane"></select>
      <button class="btn" id="au-load">Load curve</button>
    </div>
    <div id="au-svg" class="cg-svg"><span class="hint">Click "Load curve".</span></div>
    <div class="ss-toolbar" style="margin-top:10px">
      <label class="hint">Curve</label>
      <select id="au-curve"><option>smooth</option><option>ease-in</option><option>ease-out</option><option>linear</option><option>step</option></select>
      <button class="btn ghost" id="au-smooth">Smooth</button>
      <select id="au-op"><option>mirror</option><option>scale</option><option>offset</option><option>reverse</option><option>flatten</option></select>
      <button class="btn ghost" id="au-transform">Transform</button>
    </div>
    <div class="result" id="au-out" style="display:none"></div>`;

  const out = panel.querySelector("#au-out");
  function show(r){ out.style.display="block"; out.className="result "+(r.success?"ok":"err"); out.textContent=JSON.stringify(r.data||r,null,2); }
  const ti = () => Number(panel.querySelector("#au-track").value) || 0;
  const li = () => Number(panel.querySelector("#au-lane").value) || 0;

  async function loadLanes() {
    const r = await exec("get_automation_lanes", { track_index: ti() });
    const sel = panel.querySelector("#au-lane");
    sel.innerHTML = r.success ? r.data.lanes.map(l => `<option value="${l.index}">${l.parameter}</option>`).join("") : "";
  }
  async function loadCurve() {
    const r = await exec("get_envelopes", { track_index: ti(), lane_index: li() });
    const wrap = panel.querySelector("#au-svg");
    if (!r.success) { wrap.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    const pts = r.data.sample;
    const W = 800, H = 240, pad = 20;
    const maxT = Math.max(...pts.map(p => p.time), 1);
    const x = t => pad + (t / maxT) * (W - 2 * pad);
    const y = v => H - pad - v * (H - 2 * pad);
    const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const dots = pts.map(p => `<circle cx="${x(p.time)}" cy="${y(p.value)}" r="4" fill="#ffb347" />`).join("");
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="cg-canvas">
      <line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#38383f"/>
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="#38383f"/>
      <path d="${d}" fill="none" stroke="#6cc6ff" stroke-width="2.5"/>${dots}</svg>`;
  }
  panel.querySelector("#au-load").onclick = loadCurve;
  panel.querySelector("#au-smooth").onclick = async () => { show(await exec("smooth_curve", { track_index: ti(), lane_index: li(), curve: panel.querySelector("#au-curve").value })); };
  panel.querySelector("#au-transform").onclick = async () => { show(await exec("transform_curve", { track_index: ti(), lane_index: li(), operation: panel.querySelector("#au-op").value })); };
  (async () => { await loadLanes(); loadCurve(); })();
};
