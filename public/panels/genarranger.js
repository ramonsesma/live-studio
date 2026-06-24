// Rich panel: Arrangement Timeline — section blocks over time + an energy curve, from the
// real generate_arrangement tool, with the Set's actual markers overlaid. Consolidates
// genarranger + arrangement (markers). A timeline is spatial; the autoform flattened it.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.genarranger = function (panel, helpers) {
  const exec = helpers.execute;
  const api = helpers.api;
  const STYLES = ["electronic", "pop", "hiphop", "ambient", "techno", "house"];
  const CURVES = ["arc", "wave", "build", "flat"];

  panel.innerHTML = `
    <div class="panel-head"><h1>🎚️ Arrangement Timeline</h1><p>Generate a song structure and see sections + energy over time. Markers come from the real Set.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Style</label><select id="ar-style">${STYLES.map((s) => `<option>${s}</option>`).join("")}</select>
      <label class="hint">Energy</label><select id="ar-curve">${CURVES.map((s) => `<option>${s}</option>`).join("")}</select>
      <button class="btn" id="ar-gen">Generate</button>
      <button class="btn ghost" id="ar-apply">Apply energy curve</button>
      <span class="hint" id="ar-info"></span>
    </div>
    <div id="ar-svg"></div>`;

  let sections = [];
  function energyColor(e) {
    const r = Math.round(60 + e * 195), g = Math.round(200 - e * 120), b = Math.round(160 - e * 120);
    return `rgb(${r},${g},${b})`;
  }
  async function draw() {
    const W = 760, H = 320, x0 = 20, x1 = 740, top = 40, blockH = 150, baseY = 230;
    const total = sections.reduce((a, s) => a + (s.bars || 0), 0) || 1;
    let x = x0, blocks = "", curve = [];
    sections.forEach((s) => {
      const w = (s.bars / total) * (x1 - x0);
      blocks += `<g>
        <rect x="${x.toFixed(1)}" y="${top}" width="${Math.max(2, w - 3).toFixed(1)}" height="${blockH}" rx="6" fill="${energyColor(s.energy)}" opacity="0.85" />
        <text x="${(x + w / 2).toFixed(1)}" y="${top + 22}" text-anchor="middle" fill="#10101a" font-size="12" font-weight="600">${s.name}</text>
        <text x="${(x + w / 2).toFixed(1)}" y="${top + 40}" text-anchor="middle" fill="#10101a" font-size="10">${s.bars} bars</text>
      </g>`;
      curve.push([x + w / 2, baseY - s.energy * (baseY - top - 10)]);
      x += w;
    });
    const cpath = curve.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    // Real markers from the Set (cue points), placed proportionally by index.
    let markers = "";
    try {
      const m = await api.post("/api/execute", { name: "arrangement__get_markers", args: {} });
      const mk = m.success ? m.data.markers || [] : [];
      const maxT = Math.max(1, ...mk.map((q) => q.time || 0));
      mk.forEach((q) => {
        const mx = x0 + (Math.min(1, (q.time || 0) / maxT)) * (x1 - x0);
        markers += `<line x1="${mx}" y1="${top}" x2="${mx}" y2="${baseY}" stroke="#6cc6ff" stroke-dasharray="3 3" />
          <text x="${mx + 3}" y="${top + blockH + 18}" fill="#6cc6ff" font-size="10">${q.name || "cue"}</text>`;
      });
      panel.querySelector("#ar-info").textContent = `${sections.length} sections · ${total} bars · ${mk.length} markers`;
    } catch (e) { /* markers optional */ }
    panel.querySelector("#ar-svg").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#1a1a1e;border:1px solid #38383f;border-radius:10px">
        ${blocks}${markers}
        <path d="${cpath}" fill="none" stroke="#fff" stroke-width="2" opacity="0.9" />
        ${curve.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="#fff" />`).join("")}
        <text x="${x0}" y="${baseY + 24}" fill="#9a9aa2" font-size="11">energy curve →</text>
      </svg>`;
  }
  async function generate() {
    const r = await exec("generate_arrangement", {
      style: panel.querySelector("#ar-style").value,
      energy_curve: panel.querySelector("#ar-curve").value,
    });
    if (!r.success) { panel.querySelector("#ar-info").textContent = r.error; return; }
    sections = r.data.sections || [];
    draw();
  }
  async function applyCurve() {
    const points = sections.map((s) => s.energy).join(",");
    const r = await exec("set_energy_curve", { points });
    panel.querySelector("#ar-info").textContent = r.success ? `energy curve set (${r.data.pointCount} pts)` : r.error;
  }
  panel.querySelector("#ar-gen").onclick = generate;
  panel.querySelector("#ar-apply").onclick = applyCurve;
  generate();
};
