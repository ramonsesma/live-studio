// Rich panel: Track Grid — every track as a row with color swatch, mute/solo and bulk
// selection. Consolidates trackmanager (bulk ops) + trackcolor (colors). Bulk action on
// N color-coded rows is visual; the autoform made you type comma lists.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.trackmanager = function (panel, helpers) {
  const exec = helpers.execute;
  const api = helpers.api;
  const call = (name, args) => api.post("/api/execute", { name, args: args || {} });
  const SCHEMES = ["by-type", "rainbow", "gradient", "vintage", "neon", "pastel", "monochrome"];
  const PALETTE = ["#FF0000", "#FF8C00", "#FFD700", "#32CD32", "#20B2AA", "#4169E1", "#9370DB", "#FF69B4"];

  panel.innerHTML = `
    <div class="panel-head"><h1>🗂️ Track Grid</h1><p>Tracks as rows: color, mute/solo, multi-select → bulk actions. Calls the real tools.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Color scheme</label>
      <select id="tg-scheme">${SCHEMES.map((s) => `<option>${s}</option>`).join("")}</select>
      <button class="btn ghost" id="tg-apply-scheme">Apply</button>
      <button class="btn" id="tg-refresh">↻ Refresh</button>
      <span class="hint" id="tg-info"></span>
    </div>
    <div id="tg-bulk" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:8px 0;padding:8px;border:1px solid #2f2f36;border-radius:8px">
      <span class="hint" id="tg-sel">0 selected</span>
      <button class="btn ghost" data-bulk="toggle_mute">Mute</button>
      <button class="btn ghost" data-bulk="toggle_solo">Solo</button>
      <button class="btn ghost" data-bulk="toggle_arm">Arm</button>
      <span style="display:inline-flex;gap:3px" id="tg-pal"></span>
      <input id="tg-vol" type="number" value="-6" step="1" style="width:56px" /><button class="btn ghost" id="tg-setvol">dB</button>
    </div>
    <div id="tg-rows"></div>`;

  let tracks = [];
  const selected = new Set();

  panel.querySelector("#tg-pal").innerHTML = PALETTE
    .map((c) => `<span data-col="${c}" title="${c}" style="width:16px;height:16px;border-radius:4px;background:${c};cursor:pointer;display:inline-block;border:1px solid #00000055"></span>`).join("");

  function selIndices() { return [...selected].join(","); }
  function updateSel() { panel.querySelector("#tg-sel").textContent = `${selected.size} selected`; }

  function render() {
    const box = panel.querySelector("#tg-rows");
    box.innerHTML = "";
    tracks.forEach((t) => {
      const row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:24px 16px 1fr 70px 32px 32px 64px;gap:8px;align-items:center;padding:6px 8px;border-bottom:1px solid #26262b";
      row.innerHTML = `
        <input type="checkbox" ${selected.has(t.index) ? "checked" : ""} />
        <span class="tg-sw" title="click to recolor" style="width:14px;height:14px;border-radius:4px;background:${t.color || "#888"};cursor:pointer;border:1px solid #00000055"></span>
        <span style="color:#e8e8ea;font-size:13px">${t.name}</span>
        <span class="hint" style="font-size:11px">${t.type || ""}</span>
        <button class="btn ghost tg-m" style="padding:2px 0${t.muted ? ";background:#ffb347;color:#1a1a1e" : ""}">M</button>
        <button class="btn ghost tg-s" style="padding:2px 0${t.solo ? ";background:#6cc6ff;color:#1a1a1e" : ""}">S</button>
        <span class="hint" style="font-size:11px;text-align:right">${typeof t.volume === "number" ? t.volume + "dB" : ""}</span>`;
      row.querySelector("input").onchange = (e) => { e.target.checked ? selected.add(t.index) : selected.delete(t.index); updateSel(); };
      let palIdx = PALETTE.indexOf((t.color || "").toUpperCase());
      row.querySelector(".tg-sw").onclick = async (e) => {
        palIdx = (palIdx + 1) % PALETTE.length; const color = PALETTE[palIdx];
        const r = await call("trackcolor__set_track_color", { track_index: t.index, color });
        if (r.success) { t.color = r.data.color || color; e.target.style.background = t.color; }
      };
      row.querySelector(".tg-m").onclick = async (e) => {
        const r = await call("trackmanager__bulk_action", { track_indices: String(t.index), action: "toggle_mute" });
        if (r.success) { t.muted = !t.muted; e.target.style.background = t.muted ? "#ffb347" : ""; e.target.style.color = t.muted ? "#1a1a1e" : ""; }
      };
      row.querySelector(".tg-s").onclick = async (e) => {
        const r = await call("trackmanager__bulk_action", { track_indices: String(t.index), action: "toggle_solo" });
        if (r.success) { t.solo = !t.solo; e.target.style.background = t.solo ? "#6cc6ff" : ""; e.target.style.color = t.solo ? "#1a1a1e" : ""; }
      };
      box.appendChild(row);
    });
  }

  async function refresh() {
    const r = await exec("list_tracks", {});
    if (!r.success) { panel.querySelector("#tg-info").textContent = r.error; return; }
    tracks = r.data.tracks || [];
    panel.querySelector("#tg-info").textContent = `${r.data.total} tracks`;
    selected.clear(); updateSel(); render();
  }

  panel.querySelector("#tg-refresh").onclick = refresh;
  // Live refresh via SSE — but refresh() clears the checkbox selection, so only auto-refresh
  // while nothing is selected (a selection in progress must never be yanked away).
  if (helpers.onSongChanged) helpers.onSongChanged(() => { if (!selected.size) refresh(); });
  panel.querySelector("#tg-apply-scheme").onclick = async () => {
    const r = await call("trackcolor__apply_color_scheme", { scheme: panel.querySelector("#tg-scheme").value });
    if (r.success && r.data.colors) { tracks.forEach((t, i) => { t.color = r.data.colors[i] || t.color; }); render(); }
    panel.querySelector("#tg-info").textContent = r.success ? `scheme applied to ${r.data.tracksColored}` : r.error;
  };
  panel.querySelectorAll("[data-bulk]").forEach((b) => {
    b.onclick = async () => {
      if (!selected.size) { panel.querySelector("#tg-info").textContent = "Select tracks first"; return; }
      const r = await call("trackmanager__bulk_action", { track_indices: selIndices(), action: b.dataset.bulk });
      panel.querySelector("#tg-info").textContent = r.success ? `${b.dataset.bulk} → ${r.data.trackCount} tracks` : r.error;
      refresh();
    };
  });
  panel.querySelectorAll("#tg-pal [data-col]").forEach((s) => {
    s.onclick = async () => {
      if (!selected.size) { panel.querySelector("#tg-info").textContent = "Select tracks first"; return; }
      const r = await call("trackmanager__color_tracks", { track_indices: selIndices(), color: s.dataset.col });
      if (r.success) { tracks.forEach((t) => { if (selected.has(t.index)) t.color = s.dataset.col; }); render(); }
    };
  });
  panel.querySelector("#tg-setvol").onclick = async () => {
    if (!selected.size) { panel.querySelector("#tg-info").textContent = "Select tracks first"; return; }
    const volume = Number(panel.querySelector("#tg-vol").value);
    const r = await call("trackmanager__set_volume", { track_indices: selIndices(), volume });
    panel.querySelector("#tg-info").textContent = r.success ? `volume ${volume}dB → ${r.data.count} tracks` : r.error;
  };
  refresh();
};
