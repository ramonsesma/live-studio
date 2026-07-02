// Rich panel: Clip Relation Graph — SVG graph of nodes and edges. Edges are real: clips on the
// SAME TRACK, or clips sharing the same real clip.color (there's no "similar"/"harmonic" analysis
// in the backend — the legend used to advertise relationships that were never actually computed).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.clipgraph = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🕸️ Clip Relation Graph</h1><p>Graph of real relationships between clips: same track, or same clip color.</p></div>
    <div class="ss-toolbar"><button class="btn" id="cg-build">Build graph</button><span class="hint" id="cg-info"></span></div>
    <div id="cg-svg" class="cg-svg"><span class="hint">Click "Build graph".</span></div>
    <div style="display:flex;gap:14px;margin-top:8px;font-size:11px;color:#9a9aa2">
      <span><span style="display:inline-block;width:10px;height:2px;background:#6cc6ff;vertical-align:middle"></span> same track</span>
      <span><span style="display:inline-block;width:10px;height:2px;background:#ffb347;vertical-align:middle"></span> same color</span>
    </div>
    <div class="ss-toolbar" style="margin-top:14px">
      <label class="hint">Seed clip (click a node, or type t&lt;track&gt;_c&lt;slot&gt;)</label>
      <input id="cg-seed" type="text" placeholder="t0_c0" style="width:100px" />
      <button class="btn ghost" id="cg-suggest">Suggest arrangement from seed</button>
    </div>
    <div id="cg-suggestion" style="margin-top:8px"></div>`;

  const COLORS = { "same-track": "#6cc6ff", "same-color": "#ffb347" };

  async function build() {
    const r = await exec("build_graph", {});
    const wrap = panel.querySelector("#cg-svg");
    if (!r.success) { wrap.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    const { nodes, edges } = r.data;
    panel.querySelector("#cg-info").textContent = `${r.data.nodeCount} nodes · ${r.data.edgeCount} edges`;
    const W = 800, H = 600;
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="cg-canvas" preserveAspectRatio="xMidYMid meet">`;
    for (const e of edges) {
      const a = byId[e.source], b = byId[e.target];
      if (!a || !b) continue;
      svg += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${COLORS[e.type] || '#888'}" stroke-width="${1 + (e.weight || 0.5) * 3}" opacity="0.7" />`;
    }
    for (const n of nodes) {
      svg += `<g class="cg-node" data-id="${n.id}" style="cursor:pointer"><circle cx="${n.x}" cy="${n.y}" r="22" fill="#2c2c31" stroke="#ffb347" stroke-width="2" />
        <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" fill="#e8e8ea" font-size="13">${n.label}</text></g>`;
    }
    svg += `</svg>`;
    wrap.innerHTML = svg;
    wrap.querySelectorAll(".cg-node").forEach((el) => el.onclick = () => { panel.querySelector("#cg-seed").value = el.dataset.id; });
  }
  async function suggest() {
    const seed = panel.querySelector("#cg-seed").value.trim();
    const box = panel.querySelector("#cg-suggestion");
    if (!seed) { box.innerHTML = `<span class="hint">Pick or type a seed clip first.</span>`; return; }
    const r = await exec("suggest_arrangement", { seed_clip: seed, target_length: 8 });
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    box.innerHTML = `<div class="hint" style="margin-bottom:4px">${r.data.suggestion.length} section(s) · ${r.data.totalBars} bars (walks real same-track/same-color links)</div>` +
      r.data.suggestion.map((s) => `<div style="display:flex;gap:8px;padding:4px 8px;border:1px solid #2f2f36;border-radius:6px;margin-bottom:4px;font-size:12px"><span style="color:#9a9aa2;width:80px">${s.section}</span><span style="flex:1;color:#e8e8ea">${s.name}</span><span class="hint">${s.bars} bars</span></div>`).join("");
  }
  panel.querySelector("#cg-build").onclick = build;
  panel.querySelector("#cg-suggest").onclick = suggest;
  build();
};
