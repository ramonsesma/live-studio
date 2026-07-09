// Rich panel: Transient Tools — plots the clip's REAL detected onsets on a timeline so
// sensitivity can be tuned visually before slicing or non-warp quantizing.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.transients = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>⚡ Transient Tools</h1><p>Real onset detection: see the hits, then slice per transient or non-warp quantize onto the grid.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="tr-trk" type="number" value="0" />
      <label class="hint">Clip</label><input id="tr-clip" type="number" value="0" />
      <label class="hint">Sensitivity</label><input id="tr-sens" type="range" min="0.05" max="0.5" step="0.01" value="0.18" style="width:120px" />
      <span class="hint" id="tr-sens-v">0.18</span>
      <button class="btn" id="tr-go">Detect</button>
      <span class="hint" id="tr-info">set track/clip and Detect</span>
    </div>
    <div id="tr-map" style="margin-top:14px"></div>
    <div id="tr-actions" style="display:none;margin-top:12px;gap:8px;align-items:center;flex-wrap:wrap" class="ss-toolbar">
      <label class="hint">Max slices</label><input id="tr-max" type="number" value="16" style="width:60px" />
      <button class="btn" id="tr-slice">Slice per hit</button>
      <label class="hint">Grid</label>
      <select id="tr-grid"><option>1/4</option><option>1/8</option><option selected>1/16</option><option>1/32</option></select>
      <label class="hint">Strength %</label><input id="tr-strength" type="number" value="100" style="width:60px" />
      <button class="btn ghost" id="tr-quant">Quantize (non-warp)</button>
      <span class="hint" id="tr-result"></span>
    </div>`;

  let lastDur = 1;

  function args() {
    return { trackIndex: Number(panel.querySelector("#tr-trk").value), clipIndex: Number(panel.querySelector("#tr-clip").value), sensitivity: Number(panel.querySelector("#tr-sens").value) };
  }

  panel.querySelector("#tr-sens").oninput = (e) => { panel.querySelector("#tr-sens-v").textContent = e.target.value; };

  function drawMap(d) {
    const maxSec = Math.max(1, ...d.transients.map((t) => t.sec)) * 1.05;
    lastDur = maxSec;
    const marks = d.transients.map((t) => `<div title="${t.sec}s · beat ${t.beat} · strength ${t.strength}" style="position:absolute;left:${(t.sec / maxSec) * 100}%;top:0;bottom:0;width:2px;background:rgba(90,209,122,${0.35 + t.strength * 0.65})"></div>`).join("");
    panel.querySelector("#tr-map").innerHTML = `
      <div class="hint" style="margin-bottom:6px">${d.source} · tempo ${d.tempo} BPM · ${d.count} transient(s)${d.count > 128 ? " (first 128 shown)" : ""}</div>
      <div style="position:relative;height:44px;border:1px solid var(--line);border-radius:6px;background:#101014">${marks}</div>`;
  }

  async function go() {
    panel.querySelector("#tr-info").textContent = "detecting…";
    const r = await exec("detect_transients", args());
    if (!r.success) { panel.querySelector("#tr-info").textContent = r.error; panel.querySelector("#tr-actions").style.display = "none"; return; }
    panel.querySelector("#tr-info").textContent = "✓ detected";
    drawMap(r.data);
    panel.querySelector("#tr-actions").style.display = "flex";
    panel.querySelector("#tr-result").textContent = "";
  }
  panel.querySelector("#tr-go").onclick = go;

  panel.querySelector("#tr-slice").onclick = async () => {
    panel.querySelector("#tr-result").textContent = "slicing…";
    const r = await exec("slice_at_transients", { ...args(), max_slices: Number(panel.querySelector("#tr-max").value) });
    panel.querySelector("#tr-result").textContent = r.success ? `✓ wrote ${r.data.slices} slice file(s), imported` : r.error;
  };
  panel.querySelector("#tr-quant").onclick = async () => {
    panel.querySelector("#tr-result").textContent = "quantizing…";
    const r = await exec("quantize_audio", { ...args(), grid: panel.querySelector("#tr-grid").value, strength: Number(panel.querySelector("#tr-strength").value) });
    panel.querySelector("#tr-result").textContent = r.success ? `✓ moved ${r.data.segmentsMoved}/${r.data.segments} segments (avg ${r.data.avgShiftMs}ms) → new clip imported` : r.error;
  };
};
