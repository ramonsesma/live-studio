// Rich panel: Resonance · Mix Radar — renders each audio stem, FFT-analyzes it in the host,
// and maps a frequency×track masking matrix across the whole set. The matrix + corrective
// moves are computed once, server-side (resonance__mask_matrix / bridge.maskMatrix), so the
// exact same logic is reachable from the AI copilot in chat, not just from clicking here.
// "Listen" uses the real render pipeline in Live; "Demo" proves the path offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.resonance = function (panel, helpers) {
  const api = helpers.api;
  const maskMatrix = (body) => api.post("/api/execute", { name: "resonance__mask_matrix", args: body });

  panel.innerHTML = `
    <div class="panel-head"><h1>📡 Resonance · Mix Radar</h1><p>Renders your stems, <b>listens</b> (FFT in-host) and maps frequency masking across the whole set.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="r-listen"><i class="ti ti-ear" aria-hidden="true"></i> Listen</button>
      <button class="btn ghost" id="r-demo">Demo</button>
      <span class="hint" id="r-info">Press Listen (renders audio tracks) or Demo.</span>
    </div>
    <div style="display:grid;grid-template-columns:120px 1fr 190px;gap:10px;margin-top:6px">
      <div id="r-rail"></div><div id="r-heat"></div><div id="r-moves"></div>
    </div>
    <div style="display:flex;gap:14px;margin-top:8px;font-size:11px;color:#9a9aa2;flex-wrap:wrap">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#23406b;vertical-align:-1px"></span> low</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#6cc6ff;vertical-align:-1px"></span> present</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#ffb347;vertical-align:-1px"></span> loud</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#e24b4a;vertical-align:-1px"></span> masking collision</span>
    </div>`;

  const NB = 30;
  function cell(v) {
    if (v < 0.05) return "#1c2740";
    if (v < 0.45) { const k = v / 0.45; return `rgb(${Math.round(35 + k * 73)},${Math.round(64 + k * 134)},${Math.round(107 + k * 148)})`; }
    if (v < 0.72) { const k = (v - 0.45) / 0.27; return `rgb(${Math.round(108 + k * 147)},${Math.round(198 - k * 19)},${Math.round(255 - k * 184)})`; }
    const k = (v - 0.72) / 0.28; return `rgb(255,${Math.round(179 - k * 60)},${Math.round(71 - k * 30)})`;
  }

  function render(rows, moves) {
    const collisionCells = new Set();
    const W = 760, rowH = Math.max(22, Math.min(40, 220 / rows.length)), H = rows.length * rowH + 22, cw = W / NB;
    for (let b = 0; b < NB; b++) {
      const hot = rows.map((r, i) => (r.bands[b] > 0.6 ? i : -1)).filter((i) => i >= 0);
      if (hot.length >= 2) hot.forEach((i) => collisionCells.add(i + "_" + b));
    }
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Frequency by track masking heatmap" style="width:100%;background:#13131a;border:1px solid #38383f;border-radius:10px">`;
    rows.forEach((r, t) => {
      for (let b = 0; b < NB; b++) {
        const x = b * cw, y = t * rowH + 6, isHot = collisionCells.has(t + "_" + b), c = isHot ? "#e24b4a" : cell(r.bands[b]);
        svg += `<rect x="${x.toFixed(1)}" y="${y}" width="${(cw - 1.4).toFixed(1)}" height="${rowH - 4}" rx="2" fill="${c}"/>`;
        if (isHot) svg += `<rect x="${x.toFixed(1)}" y="${y}" width="${(cw - 1.4).toFixed(1)}" height="${rowH - 4}" rx="2" fill="none" stroke="#ff8a8a" stroke-width="1.1"/>`;
      }
    });
    [["20", 0], ["100", 0.12], ["500", 0.34], ["1k", 0.5], ["4k", 0.72], ["12k", 0.92]].forEach((l) => { svg += `<text x="${Math.min(W - 18, l[1] * W + 2)}" y="${H - 4}" fill="#6c6c76" font-size="10">${l[0]}</text>`; });
    svg += `</svg>`;
    panel.querySelector("#r-heat").innerHTML = svg;

    panel.querySelector("#r-rail").innerHTML = `<div style="padding-top:6px">` + rows.map((r) => {
      const p = Math.max(0, Math.min(1, (r.rmsDb + 40) / 40));
      return `<div style="height:${rowH}px;display:flex;align-items:center;gap:6px;padding-right:2px">
        <span style="flex:1;color:#e8e8ea;font-size:12px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name}</span>
        <span style="width:34px;height:7px;background:#202026;border:1px solid #34343b;border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:${Math.round(p * 100)}%;background:${p > 0.85 ? "#e24b4a" : p > 0.6 ? "#ffb347" : "#5ad17a"}"></span></span>
      </div>`;
    }).join("") + `</div>`;

    panel.querySelector("#r-moves").innerHTML = `<div style="font-size:12px;color:#9a9aa2;margin:2px 0 6px">Proposed moves</div>` +
      ((moves || []).length ? moves.map((m) => `
        <div style="border:1px solid #2f2f36;border-radius:8px;padding:7px 8px;margin-bottom:6px">
          <div style="color:#e8e8ea;font-size:12px"><i class="ti ti-wave-square" style="color:#ffb347" aria-hidden="true"></i> ${m.trackName} vs ${m.vsName} @ ${m.hz} Hz</div>
          <div style="color:#9a9aa2;font-size:11px;margin:3px 0 6px">carve EQ on ${m.trackName}</div>
          <button class="btn ghost r-apply" data-trk="${m.trackIndex}" style="padding:2px 9px;font-size:11px">Apply</button>
        </div>`).join("") : `<span class="hint" style="font-size:11px">No masking collisions found.</span>`);
    panel.querySelectorAll(".r-apply").forEach((b) => {
      b.onclick = async () => {
        const res = await api.post("/api/execute", { name: "eq__apply_eq_preset", args: { track_index: Number(b.dataset.trk), preset: "bass_cut", create_eq: true } });
        b.textContent = res.success ? "✓ carved" : "✗"; b.disabled = res.success;
      };
    });
  }

  function setInfo(t) { panel.querySelector("#r-info").textContent = t; }

  async function doListen() {
    setInfo("Rendering & analyzing stems…");
    const r = await maskMatrix({});
    if (!r.success) { setInfo(r.error + " — showing Demo instead."); return doDemo(); }
    setInfo(`${r.data.rows.length} stems analyzed · ${r.data.collisionCount} masking bands`);
    render(r.data.rows, r.data.moves);
  }

  async function doDemo() {
    setInfo("Demo: synthetic stems (proves the render→FFT path offline).");
    const r = await maskMatrix({ demo: true });
    if (!r.success) { setInfo(r.error); return; }
    render(r.data.rows, r.data.moves);
  }

  panel.querySelector("#r-listen").onclick = doListen;
  panel.querySelector("#r-demo").onclick = doDemo;
  doDemo();
};
