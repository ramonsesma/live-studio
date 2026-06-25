// Rich panel: Edit History — a global timeline of destructive edits with one-click undo.
// Demo shows a sample timeline so it previews offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.history = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>↩️ Edit History</h1><p>Every destructive edit across the toolkit records a restore point here. Undo the last change from any module, or clear the timeline.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="h-undo"><i class="ti ti-arrow-back-up" aria-hidden="true"></i> Undo last</button>
      <button class="btn ghost" id="h-refresh"><i class="ti ti-refresh" aria-hidden="true"></i> Refresh</button>
      <button class="btn ghost" id="h-clear">Clear</button>
      <span class="hint" id="h-info"></span>
    </div>
    <div id="h-list" style="margin-top:10px;display:flex;flex-direction:column;gap:5px"></div>`;

  function fmt(ts) { try { return new Date(ts).toLocaleTimeString(); } catch { return ""; } }
  function scopeTag(key) {
    const t = (key || "").split(":")[0];
    const col = t === "clip" ? "#b58ce0" : t === "track" ? "#82c98a" : t === "device" ? "#6cc6ff" : "#9a9aa3";
    return `<span style="font-size:9.5px;border:1px solid ${col}44;color:${col};border-radius:4px;padding:1px 6px">${key}</span>`;
  }
  function render(entries, demo) {
    panel.querySelector("#h-info").textContent = demo ? "Demo (offline)" : `${entries.length} recent edit${entries.length === 1 ? "" : "s"}`;
    panel.querySelector("#h-list").innerHTML = entries.length ? entries.map((e, i) => `
      <div style="display:flex;align-items:center;gap:10px;border:1px solid ${i === 0 ? "#3a3a44" : "#2f2f36"};border-radius:7px;padding:8px 11px;background:${i === 0 ? "#16161c" : "#13131a"}">
        <span style="width:18px;color:#6b6b73;font-size:11px;text-align:right">${i + 1}</span>
        <span style="flex:1;color:#e8e8ea;font-size:12px">${e.label}</span>
        ${scopeTag(e.key)}
        <span class="hint" style="font-size:10px">${fmt(e.ts)}</span>
      </div>`).join("") : `<div class="hint" style="padding:10px">No edits yet — run any note/color/parameter change and it shows up here.</div>`;
  }
  async function refresh() {
    const r = await exec("list", { limit: 25 });
    if (r.success) render(r.data.entries, false); else demo();
  }
  async function undoLast() {
    const r = await exec("undo_last", {});
    panel.querySelector("#h-info").textContent = r.success ? `Undone: ${r.data.undone} (${r.data.remaining} left)` : (r.error || "Nothing to undo");
    refresh();
  }
  async function clear() {
    const r = await exec("clear", {});
    panel.querySelector("#h-info").textContent = r.success ? `Cleared ${r.data.cleared}` : r.error;
    refresh();
  }
  function demo() {
    render([
      { label: "miditransform.humanize", key: "clip:1:0", ts: Date.now() - 4000 },
      { label: "colortheory.apply_to_track", key: "clip:1:0", ts: Date.now() - 12000 },
      { label: "groovetemplate.set_lane_dynamics", key: "clip:0:0", ts: Date.now() - 21000 },
      { label: "paramdiff.normalize_param", key: "device:2:0", ts: Date.now() - 35000 },
      { label: "transposer.apply", key: "clip:3:0", ts: Date.now() - 52000 },
    ], true);
  }
  panel.querySelector("#h-undo").onclick = undoLast;
  panel.querySelector("#h-refresh").onclick = refresh;
  panel.querySelector("#h-clear").onclick = clear;
  refresh();
};
