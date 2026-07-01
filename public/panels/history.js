// Rich panel: Edit History — a visual undo/redo timeline for every destructive edit across the
// toolkit. Two real, independent stacks (not "undo of undo"): undoing moves an entry to the redo
// side, and redo genuinely re-applies that edit. Click any entry to jump straight to undoing/
// redoing that specific clip/track/device, not just the most recent change.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.history = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>↩️ Edit History</h1><p>Every destructive edit across the toolkit records a real, reversible checkpoint here — undo or redo the last change globally, or jump to a specific one.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="h-undo"><i class="ti ti-arrow-back-up" aria-hidden="true"></i> Undo last</button>
      <button class="btn" id="h-redo"><i class="ti ti-arrow-forward-up" aria-hidden="true"></i> Redo last</button>
      <button class="btn ghost" id="h-refresh"><i class="ti ti-refresh" aria-hidden="true"></i> Refresh</button>
      <button class="btn ghost" id="h-clear">Clear</button>
      <span class="hint" id="h-info"></span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px">
      <div>
        <div style="font-size:12px;color:#9a9aa2;margin-bottom:6px">Undo stack (most recent first)</div>
        <div id="h-list"></div>
      </div>
      <div>
        <div style="font-size:12px;color:#9a9aa2;margin-bottom:6px">Redo stack (most recently undone first)</div>
        <div id="h-redolist"></div>
      </div>
    </div>`;

  function fmt(ts) { try { return new Date(ts).toLocaleTimeString(); } catch { return ""; } }
  function scopeTag(key) {
    const t = (key || "").split(":")[0];
    const col = t === "clip" ? "#b58ce0" : t === "track" ? "#82c98a" : t === "device" ? "#6cc6ff" : "#9a9aa3";
    return `<span style="font-size:9.5px;border:1px solid ${col}44;color:${col};border-radius:4px;padding:1px 6px">${key}</span>`;
  }
  function keyArgs(key) {
    const [scope, a, b] = (key || "").split(":");
    if (scope === "clip") return { scope: "clip", track_index: +a, clip_index: +b };
    if (scope === "device") return { scope: "device", track_index: +a, device_index: +b };
    if (scope === "track") return { scope: "track", track_index: +a };
    return null;
  }
  function row(e, i, kind) {
    const jumpBtn = kind === "undo" ? "h-jumpundo" : "h-jumpredo";
    return `<div style="display:flex;align-items:center;gap:8px;border:1px solid ${i === 0 ? "#3a3a44" : "#2f2f36"};border-radius:7px;padding:7px 10px;background:${i === 0 ? "#16161c" : "#13131a"};margin-bottom:5px;cursor:pointer" class="${jumpBtn}" data-key="${e.key}">
      <span style="width:16px;color:#6b6b73;font-size:11px;text-align:right">${i + 1}</span>
      <span style="flex:1;color:#e8e8ea;font-size:12px">${e.label}</span>
      ${scopeTag(e.key)}
      <span class="hint" style="font-size:10px">${fmt(e.ts)}</span>
    </div>`;
  }
  function render(entries, redoEntries, demo) {
    panel.querySelector("#h-info").textContent = demo ? "Demo (offline)" : `${entries.length} undo · ${redoEntries.length} redo available`;
    panel.querySelector("#h-list").innerHTML = entries.length ? entries.map((e, i) => row(e, i, "undo")).join("") : `<div class="hint" style="padding:10px">No edits yet — run any note/color/parameter change and it shows up here.</div>`;
    panel.querySelector("#h-redolist").innerHTML = redoEntries.length ? redoEntries.map((e, i) => row(e, i, "redo")).join("") : `<div class="hint" style="padding:10px">Nothing undone yet.</div>`;
    panel.querySelectorAll(".h-jumpundo").forEach((el) => el.onclick = () => jump(el.dataset.key, "undo"));
    panel.querySelectorAll(".h-jumpredo").forEach((el) => el.onclick = () => jump(el.dataset.key, "redo"));
  }
  async function jump(key, dir) {
    const args = keyArgs(key);
    if (!args) return;
    const r = await exec(dir === "undo" ? "undo_target" : "redo_target", args);
    panel.querySelector("#h-info").textContent = r.success ? `${dir === "undo" ? "Undone" : "Redone"}: ${r.data.undone || r.data.redone}` : (r.error || "Nothing there");
    refresh();
  }
  async function refresh() {
    const r = await exec("list", { limit: 25 });
    const rr = await exec("list_redo", { limit: 25 });
    if (r.success) render(r.data.entries, rr.success ? rr.data.entries : [], false); else demo();
  }
  async function undoLast() {
    const r = await exec("undo_last", {});
    panel.querySelector("#h-info").textContent = r.success ? `Undone: ${r.data.undone} (${r.data.remaining} left)` : (r.error || "Nothing to undo");
    refresh();
  }
  async function redoLast() {
    const r = await exec("redo_last", {});
    panel.querySelector("#h-info").textContent = r.success ? `Redone: ${r.data.redone} (${r.data.remainingRedo} more)` : (r.error || "Nothing to redo");
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
    ], [
      { label: "trackmanager.bulk_action(mute)", key: "track:4", ts: Date.now() - 2000 },
    ], true);
  }
  panel.querySelector("#h-undo").onclick = undoLast;
  panel.querySelector("#h-redo").onclick = redoLast;
  panel.querySelector("#h-refresh").onclick = refresh;
  panel.querySelector("#h-clear").onclick = clear;
  refresh();
};
