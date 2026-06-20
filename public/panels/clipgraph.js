// Rich panel: Clip Relation Graph — SVG graph of nodes and edges.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.clipgraph = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🕸️ Clip Relation Graph</h1><p>Graph of relationships between clips (follows / similar / harmonic).</p></div>
    <div class="ss-toolbar"><button class="btn" id="cg-build">Build graph</button><span class="hint" id="cg-info"></span></div>
    <div id="cg-svg" class="cg-svg"><span class="hint">Click "Build graph".</span></div>`;

  const COLORS = { follows: "#6cc6ff", similar: "#ffb347", harmonic: "#5ad17a" };

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
      svg += `<g><circle cx="${n.x}" cy="${n.y}" r="22" fill="#2c2c31" stroke="#ffb347" stroke-width="2" />
        <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" fill="#e8e8ea" font-size="13">${n.label}</text></g>`;
    }
    svg += `</svg>`;
    wrap.innerHTML = svg;
  }
  panel.querySelector("#cg-build").onclick = build;
  build();
};
