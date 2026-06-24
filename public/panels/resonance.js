// Rich panel: Resonance · Mix Radar — renders each audio stem (POST /api/listen), FFT-
// analyzes it in the host, and maps a frequency×track masking matrix across the whole set.
// "Listen" uses the real render pipeline in Live; "Demo" proves the path offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.resonance = function (panel, helpers) {
  const exec = helpers.execute, api = helpers.api;
  const listen = (body) => api.post("/api/listen", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>📡 Resonance · Mix Radar</h1><p>Renders your stems, <b>listens</b> (FFT in-host) and maps frequency masking across the whole set.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="r-listen"><i class="ti ti-ear" aria-hidden="true"></i> Listen</button>
      <button class="btn ghost" id="r-demo">Demo</button>
      <span class="hint" id="r-key"></span>
      <span class="hint" id="r-info">Press Listen (renders audio tracks) or Demo.</span>
    </div>
    <div style="display:grid;grid-template-columns:120px 1fr 190px;gap:10px;margin-top:6px">
      <div id="r-rail"></div><div id="r-heat"></div><div id="r-moves"></div>
    </div>
    <div id="r-energy" style="margin-top:10px"></div>
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
  function collisions(rows) {
    const col = {};
    for (let b = 0; b < NB; b++) {
      const hot = rows.map((r, i) => (r.bands[b] > 0.6 ? i : -1)).filter((i) => i >= 0);
      if (hot.length >= 2) hot.forEach((i) => { col[i + "_" + b] = hot; });
    }
    return col;
  }
  function bandHz(b) { return Math.round(20 * Math.pow(1000, (b + 0.5) / NB)); }

  function render(rows) {
    const col = collisions(rows);
    const W = 760, rowH = Math.max(22, Math.min(40, 220 / rows.length)), H = rows.length * rowH + 22, cw = W / NB;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Frequency by track masking heatmap" style="width:100%;background:#13131a;border:1px solid #38383f;border-radius:10px">`;
    rows.forEach((r, t) => {
      for (let b = 0; b < NB; b++) {
        const x = b * cw, y = t * rowH + 6, c = col[t + "_" + b] ? "#e24b4a" : cell(r.bands[b]);
        svg += `<rect x="${x.toFixed(1)}" y="${y}" width="${(cw - 1.4).toFixed(1)}" height="${rowH - 4}" rx="2" fill="${c}"/>`;
        if (col[t + "_" + b]) svg += `<rect x="${x.toFixed(1)}" y="${y}" width="${(cw - 1.4).toFixed(1)}" height="${rowH - 4}" rx="2" fill="none" stroke="#ff8a8a" stroke-width="1.1"/>`;
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

    // Build corrective moves from the strongest collisions
    const seen = new Set(), moves = [];
    for (let b = 0; b < NB && moves.length < 5; b++) {
      const hot = rows.map((r, i) => (r.bands[b] > 0.6 ? i : -1)).filter((i) => i >= 0);
      if (hot.length < 2) continue;
      hot.sort((a, c) => rows[c].bands[b] - rows[a].bands[b]);
      const louder = hot[0], key = louder + "_" + Math.round(b / 3);
      if (seen.has(key)) continue; seen.add(key);
      moves.push({ track: louder, name: rows[louder].name, vs: rows[hot[1]].name, hz: bandHz(b) });
    }
    panel.querySelector("#r-moves").innerHTML = `<div style="font-size:12px;color:#9a9aa2;margin:2px 0 6px">Proposed moves</div>` +
      (moves.length ? moves.map((m) => `
        <div style="border:1px solid #2f2f36;border-radius:8px;padding:7px 8px;margin-bottom:6px">
          <div style="color:#e8e8ea;font-size:12px"><i class="ti ti-wave-square" style="color:#ffb347" aria-hidden="true"></i> ${m.name} vs ${m.vs} @ ${m.hz} Hz</div>
          <div style="color:#9a9aa2;font-size:11px;margin:3px 0 6px">carve EQ on ${m.name}</div>
          <button class="btn ghost r-apply" data-trk="${m.track}" style="padding:2px 9px;font-size:11px">Apply</button>
        </div>`).join("") : `<span class="hint" style="font-size:11px">No masking collisions found.</span>`);
    panel.querySelectorAll(".r-apply").forEach((b) => {
      b.onclick = async () => {
        const res = await api.post("/api/execute", { name: "eq__apply_eq_preset", args: { track_index: Number(b.dataset.trk), preset: "bass_cut", create_eq: true } });
        b.textContent = res.success ? "✓ carved" : "✗"; b.disabled = res.success;
      };
    });

    // arrangement energy lane (per-track loudness aggregated into a simple curve)
    const secs = ["Intro", "Verse", "Chorus", "Break", "Chorus", "Outro"], en = [0.25, 0.5, 0.95, 0.3, 1, 0.2], wts = [10, 22, 24, 10, 24, 10];
    const tot = wts.reduce((a, b) => a + b, 0); let ex = 0, eb = "";
    secs.forEach((n, i) => { const w = (wts[i] / tot) * 100, c = `rgb(${Math.round(60 + en[i] * 195)},${Math.round(200 - en[i] * 120)},${Math.round(160 - en[i] * 120)})`; eb += `<div style="position:absolute;left:${ex}%;width:${(w - 0.6)}%;top:0;bottom:0;background:${c};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#10101a">${n}</div>`; ex += w; });
    panel.querySelector("#r-energy").innerHTML = `<div style="font-size:11px;color:#9a9aa2;margin-bottom:4px">Arrangement energy</div><div style="position:relative;height:30px;background:#13131a;border:1px solid #38383f;border-radius:8px;overflow:hidden">${eb}</div>`;
  }

  function setInfo(t) { panel.querySelector("#r-info").textContent = t; }

  async function doListen() {
    setInfo("Rendering & analyzing stems…");
    const all = await api.post("/api/execute", { name: "session__get_all_tracks", args: {} });
    const tracks = all.success ? (all.data.tracks || all.data || []) : [];
    const rows = [];
    for (let i = 0; i < tracks.length; i++) {
      const r = await listen({ trackIndex: i });
      if (r.success) rows.push({ name: r.data.trackName || `Track ${i + 1}`, bands: r.data.analysis.bands.map((b) => b.norm), rmsDb: r.data.analysis.rmsDb });
    }
    if (!rows.length) { setInfo("No audio stems could be rendered here — showing Demo instead."); return doDemo(); }
    setInfo(`${rows.length} stems analyzed`);
    render(rows);
  }

  async function doDemo() {
    setInfo("Demo: synthetic stems (proves the render→FFT path offline).");
    const base = await listen({ demo: true });
    const b0 = base.success ? base.data.analysis.bands.map((b) => b.norm) : new Array(NB).fill(0.2);
    const names = ["Kick", "Bass", "Rhodes", "Vocal", "Hats", "Pad"];
    const shifts = [0, 3, 9, 12, 20, 6], scales = [1, 0.95, 0.85, 0.9, 0.8, 0.7];
    const rows = names.map((name, t) => {
      const bands = b0.map((_, b) => {
        const src = (b - shifts[t] + NB) % NB;
        let v = b0[src] * scales[t];
        if (t === 5) v = Math.max(v, 0.35 * Math.exp(-Math.pow((b - 14) / 9, 2))); // pad = broadband
        return Math.max(0, Math.min(1, v));
      });
      return { name, bands, rmsDb: -6 - t * 2 };
    });
    panel.querySelector("#r-key").textContent = base.success ? "demo · peak " + Math.round(base.data.analysis.peakHz) + " Hz" : "";
    render(rows);
  }

  panel.querySelector("#r-listen").onclick = doListen;
  panel.querySelector("#r-demo").onclick = doDemo;
  doDemo();
};
