// Rich panel: Synth Patchbay — node/cable graph from the real signal_flow_visual tool.
// Add modules; they chain together. A patchbay is a graph, not a form.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.synth = function (panel, helpers) {
  const exec = helpers.execute;
  const TYPES = ["oscillator", "filter", "envelope", "lfo", "vca", "mixer", "delay", "reverb"];
  const COLOR = {
    oscillator: "#ffb347", filter: "#6cc6ff", envelope: "#5ad17a", lfo: "#c792ea",
    vca: "#ff7597", mixer: "#f0c674", delay: "#7fdbca", reverb: "#82aaff",
  };

  panel.innerHTML = `
    <div class="panel-head"><h1>🔌 Synth Patchbay</h1><p>Add modules; they patch into a signal chain. Rendered from the real signal-flow tool.</p></div>
    <div class="ss-toolbar">
      ${TYPES.map((t) => `<button class="btn ghost" data-type="${t}">+ ${t}</button>`).join("")}
      <button class="btn" id="sy-refresh">↻</button>
      <span class="hint" id="sy-info"></span>
    </div>
    <div id="sy-svg"></div>`;

  let count = 0;
  async function addModule(type) {
    const position_x = 90 + (count % 4) * 175;
    const position_y = 90 + Math.floor(count / 4) * 150;
    const r = await exec("add_module", { type, position_x, position_y });
    if (r.success) count = r.data.totalModules;
    await refresh();
  }
  async function refresh() {
    const r = await exec("signal_flow_visual", {});
    const wrap = panel.querySelector("#sy-svg");
    if (!r.success) { wrap.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    const mods = r.data.modules || [];
    panel.querySelector("#sy-info").textContent = `${mods.length} modules · ${(r.data.connections || []).length} cables`;
    if (!mods.length) { wrap.innerHTML = `<div style="padding:24px" class="hint">Add modules to build a patch.</div>`; return; }
    const byId = Object.fromEntries(mods.map((m) => [m.id, m]));
    const W = 760, H = Math.max(260, 90 + Math.ceil(mods.length / 4) * 150 + 40);
    let cables = "";
    (r.data.connections || []).forEach((c) => {
      const a = byId[String(c.from).split(".")[0]] || byId[Number(String(c.from).split(".")[0])];
      const b = byId[String(c.to).split(".")[0]] || byId[Number(String(c.to).split(".")[0])];
      if (!a || !b) return;
      cables += `<path d="M${a.x + 60},${a.y} C${a.x + 120},${a.y} ${b.x - 60},${b.y} ${b.x},${b.y}" fill="none" stroke="#ff6b6b" stroke-width="2.5" opacity="0.8" />`;
    });
    let nodes = "";
    mods.forEach((m) => {
      const c = COLOR[m.type] || "#888";
      nodes += `<g>
        <rect x="${m.x - 60}" y="${m.y - 26}" width="120" height="52" rx="9" fill="#26262b" stroke="${c}" stroke-width="2" />
        <circle cx="${m.x - 60}" cy="${m.y}" r="4" fill="${c}" /><circle cx="${m.x + 60}" cy="${m.y}" r="4" fill="${c}" />
        <text x="${m.x}" y="${m.y - 4}" text-anchor="middle" fill="#e8e8ea" font-size="12">${m.type}</text>
        <text x="${m.x}" y="${m.y + 12}" text-anchor="middle" fill="#9a9aa2" font-size="10">#${m.id}</text>
      </g>`;
    });
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#1a1a1e;border:1px solid #38383f;border-radius:10px">${cables}${nodes}</svg>`;
  }
  panel.querySelectorAll("[data-type]").forEach((b) => { b.onclick = () => addModule(b.dataset.type); });
  panel.querySelector("#sy-refresh").onclick = refresh;
  refresh();
};
