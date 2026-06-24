// Rich panel: Project Snapshot · Git — versions the whole Set to disk. Save snapshots,
// pick two for a GitHub-style diff, and restore one. All via /api/snapshot.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.projectsnapshot = function (panel, helpers) {
  const api = helpers.api;
  const snap = (body) => api.post("/api/snapshot", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>📸 Project Snapshot · Git</h1><p>Versions the whole Set to disk: save, diff two versions and restore. Like git for your project.</p></div>
    <div class="ss-toolbar">
      <input id="ps-label" placeholder="label (e.g. before master)" style="width:180px" />
      <button class="btn" id="ps-save"><i class="ti ti-camera" aria-hidden="true"></i> Snapshot now</button>
      <button class="btn ghost" id="ps-refresh">↻</button>
      <span class="hint" id="ps-info">Pick two snapshots to diff.</span>
    </div>
    <div id="ps-list" style="margin-top:8px"></div>
    <div id="ps-diff" style="margin-top:10px"></div>`;

  let sel = [];
  const fmt = (ts) => { try { return new Date(ts).toLocaleString(); } catch { return ts; } };

  async function refresh() {
    const r = await snap({ action: "list" });
    const box = panel.querySelector("#ps-list");
    const items = r.success ? r.data.snapshots || [] : [];
    if (!items.length) { box.innerHTML = `<span class="hint">No snapshots yet — press "Snapshot now".</span>`; return; }
    box.innerHTML = "";
    items.forEach((s) => {
      const row = document.createElement("div");
      const on = sel.includes(s.id);
      row.style.cssText = `display:grid;grid-template-columns:18px 1fr 150px 70px 28px;gap:10px;align-items:center;padding:7px 9px;border:1px solid ${on ? "#6cc6ff" : "#2f2f36"};border-radius:8px;margin-bottom:6px;cursor:pointer`;
      row.innerHTML = `
        <span style="width:12px;height:12px;border-radius:3px;border:2px solid ${on ? "#6cc6ff" : "#444"};background:${on ? "#6cc6ff" : "transparent"}"></span>
        <span><span style="color:#e8e8ea;font-size:13px">${s.label || "snapshot"}</span><br><span class="hint" style="font-size:10px">${fmt(s.timestamp)}</span></span>
        <span class="hint" style="font-size:11px">${s.summary.tracks} trk · ${s.summary.notes} notes · ${s.summary.scenes} sc · ${s.summary.tempo} BPM</span>
        <button class="btn ghost ps-restore" style="padding:3px 8px;font-size:11px">Restore</button>
        <button class="btn ghost ps-del" style="padding:3px 6px;font-size:11px" title="delete">✕</button>`;
      row.onclick = (e) => {
        if (e.target.closest(".ps-restore") || e.target.closest(".ps-del")) return;
        const i = sel.indexOf(s.id);
        if (i >= 0) sel.splice(i, 1); else { sel.push(s.id); if (sel.length > 2) sel.shift(); }
        refresh(); if (sel.length === 2) doDiff();
      };
      row.querySelector(".ps-restore").onclick = async () => {
        const rr = await snap({ action: "restore", id: s.id });
        panel.querySelector("#ps-info").textContent = rr.success ? `Restored: ${rr.data.tracksRestored} tracks, ${rr.data.mixersRestored} mixers, ${rr.data.clipsRestored} clips, ${rr.data.scenesRestored} scenes` : rr.error;
      };
      row.querySelector(".ps-del").onclick = async () => { await snap({ action: "delete", id: s.id }); sel = sel.filter((x) => x !== s.id); refresh(); };
      box.appendChild(row);
    });
  }

  async function doDiff() {
    const r = await snap({ action: "diff", idA: sel[0], idB: sel[1] });
    const box = panel.querySelector("#ps-diff");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    const c = r.data.counts, lines = r.data.lines;
    const COL = { "+": "#5ad17a", "-": "#e24b4a", "~": "#ffb347" };
    const BG = { "+": "#16271b", "-": "#2a1618", "~": "#2a2316" };
    box.innerHTML = `
      <div style="font-size:12px;color:#9a9aa2;margin-bottom:6px">Diff (oldest → newest): <span style="color:#5ad17a">+${c.added}</span> <span style="color:#e24b4a">−${c.removed}</span> <span style="color:#ffb347">~${c.changed}</span></div>
      <div style="font-family:var(--font-mono);font-size:12px;border:1px solid #2f2f36;border-radius:8px;overflow:hidden">
        ${lines.length ? lines.map((l) => `<div style="display:flex;gap:8px;padding:4px 10px;background:${BG[l.sign]};color:${COL[l.sign]}"><span style="width:10px">${l.sign}</span><span style="color:#cfcfd4">${l.text}</span></div>`).join("") : `<div style="padding:8px 10px" class="hint">identical — no changes</div>`}
      </div>`;
  }

  panel.querySelector("#ps-save").onclick = async () => {
    const r = await snap({ action: "save", label: panel.querySelector("#ps-label").value || "snapshot" });
    panel.querySelector("#ps-info").textContent = r.success ? `Saved "${r.data.id}" (${r.data.summary.tracks} tracks, ${r.data.summary.notes} notes)` : r.error;
    panel.querySelector("#ps-label").value = ""; refresh();
  };
  panel.querySelector("#ps-refresh").onclick = refresh;
  refresh();
};
