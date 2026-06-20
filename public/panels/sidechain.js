// Panel rico: Sidechain — grafo de routing (source → targets).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.sidechain = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🔗 Sidechain</h1><p>Rutas de sidechain del proyecto y detección de problemas.</p></div>
    <div class="ss-toolbar"><button class="btn" id="sc-go">Visualizar routing</button><button class="btn ghost" id="sc-issues">Detectar problemas</button></div>
    <div id="sc-svg" class="cg-svg"><span class="hint">Pulsa «Visualizar routing».</span></div>
    <div id="sc-issues-box" class="org-list-box" style="margin-top:10px"></div>`;

  async function go() {
    const r = await exec("visualize_routing", {});
    const wrap = panel.querySelector("#sc-svg");
    if (!r.success) { wrap.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    const { nodes, edges } = r.data;
    const W = 800, H = 320, pad = 60;
    const sources = nodes.filter(n => n.type === "source");
    const others = nodes.filter(n => n.type !== "source");
    const pos = {};
    sources.forEach((n, i) => pos[n.id] = { x: pad, y: H / (sources.length + 1) * (i + 1) });
    others.forEach((n, i) => pos[n.id] = { x: W - pad, y: H / (others.length + 1) * (i + 1) });
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="cg-canvas">`;
    for (const e of edges) {
      const a = pos[e.from], b = pos[e.to];
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2;
      svg += `<path d="M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}" fill="none" stroke="#ffb347" stroke-width="2.5" opacity="0.8"/>
        <text x="${mx}" y="${(a.y+b.y)/2 - 6}" text-anchor="middle" fill="#9a9aa2" font-size="11">${e.depth||""}</text>`;
    }
    for (const n of nodes) {
      const p = pos[n.id]; if (!p) continue;
      const fill = n.type === "source" ? "#ffb347" : "#2c2c31";
      const tcol = n.type === "source" ? "#1a1a1d" : "#e8e8ea";
      svg += `<g><rect x="${p.x-46}" y="${p.y-16}" width="92" height="32" rx="8" fill="${fill}" stroke="#38383f"/><text x="${p.x}" y="${p.y+4}" text-anchor="middle" fill="${tcol}" font-size="12">${n.label}</text></g>`;
    }
    svg += `</svg>`;
    wrap.innerHTML = svg;
  }
  panel.querySelector("#sc-go").onclick = go;
  panel.querySelector("#sc-issues").onclick = async () => {
    const r = await exec("detect_issues", {});
    const box = panel.querySelector("#sc-issues-box");
    box.innerHTML = "";
    if (r.success) for (const iss of r.data.issues) {
      const li = document.createElement("div");
      li.className = "hm-compat-row" + (iss.severity === "low" || iss.severity === "warning" ? " warn" : "");
      li.innerHTML = `<span>${iss.message}</span><span class="hint">${iss.severity}</span>`;
      box.appendChild(li);
    }
  };
  go();
};
