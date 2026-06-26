// Rich panel: Quick Actions — a browsable, grouped launcher for the curated one-click presets.
// Each card runs its real tool (via /api/execute) with preset args. Complements the Cmd-K search.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.quickactions = function (panel, helpers) {
  const exec = helpers.execute, api = helpers.api;
  const GROUP_COL = { Tempo: "#f0a04b", Transpose: "#b58ce0", Chords: "#b58ce0", Melody: "#b58ce0", Arp: "#b58ce0", Drums: "#e8617a", Swing: "#b58ce0", Groove: "#b58ce0", Quantize: "#b58ce0", "Step Seq": "#b58ce0", Randomize: "#b58ce0", EQ: "#6cc6ff", Mixer: "#6cc6ff", Analyze: "#57c7e0", Transform: "#b58ce0", State: "#82c98a", Create: "#82c98a", Color: "#82c98a" };

  panel.innerHTML = `
    <div class="panel-head"><h1>⚡ Quick Actions</h1><p>One-click presets that route to real tools. Browse by group below, or press <code>⌘K</code> to search them all.</p></div>
    <div class="ss-toolbar">
      <input id="qa-search" type="text" placeholder="Filter actions…" style="flex:1;min-width:200px" />
      <span class="hint" id="qa-info"></span>
    </div>
    <div id="qa-groups" style="margin-top:12px"></div>`;

  let all = [];
  function render(filter) {
    const q = (filter || "").toLowerCase();
    const items = q ? all.filter((a) => (a.group + " " + a.name + " " + a.tool).toLowerCase().includes(q)) : all;
    panel.querySelector("#qa-info").textContent = `${items.length} / ${all.length} actions`;
    const groups = {};
    for (const a of items) (groups[a.group] = groups[a.group] || []).push(a);
    panel.querySelector("#qa-groups").innerHTML = Object.keys(groups).sort().map((g) => {
      const col = GROUP_COL[g] || "#9a9aa3";
      return `<div style="margin-bottom:14px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${col};margin-bottom:7px">${g} <span style="color:#6b6b73">· ${groups[g].length}</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${groups[g].map((a) => `<button class="qa-run" data-tool="${a.tool}" data-args='${JSON.stringify(a.args).replace(/'/g, "&#39;")}' title="${a.tool}" style="font-size:12px;border:1px solid ${col}44;background:${col}10;color:#e8e8ea;border-radius:7px;padding:5px 11px;cursor:pointer">${a.name}</button>`).join("")}</div>
      </div>`;
    }).join("") || `<div class="hint" style="padding:10px">No actions match.</div>`;
    panel.querySelectorAll(".qa-run").forEach((b) => b.onclick = async () => {
      const old = b.textContent; b.disabled = true; b.textContent = "…";
      const r = await api.post("/api/execute", { name: b.dataset.tool, args: JSON.parse(b.dataset.args) });
      b.textContent = (r && r.success ? "✓ " : "✕ ") + old; setTimeout(() => { b.textContent = old; b.disabled = false; }, 1400);
    });
  }
  async function load() {
    const r = await exec("list_quick_actions", {});
    all = r.success ? r.data.actions : demo();
    render("");
  }
  function demo() {
    return [
      { group: "Tempo", name: "128 BPM", tool: "temposync__set_tempo", args: { bpm: 128 } },
      { group: "Tempo", name: "174 BPM", tool: "temposync__set_tempo", args: { bpm: 174 } },
      { group: "Transpose", name: "+12 st", tool: "miditransform__transpose", args: { semitones: 12 } },
      { group: "Chords", name: "i–VI–III–VII", tool: "harmonizer__generate_expressive", args: { degrees: "i,VI,III,VII" } },
      { group: "Drums", name: "Four on the floor", tool: "genrhythm__generate", args: { density: 70 } },
      { group: "Analyze", name: "Detect key", tool: "keyscale__detect_key", args: {} },
    ];
  }
  panel.querySelector("#qa-search").oninput = (e) => render(e.target.value);
  load();
};
