// Rich panel: Mix Scene Saver — save/recall/compare real mixer snapshots (volume/pan/mute/solo/sends).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.mixscene = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎚️ Mix Scene Saver</h1><p>Save the current mixer state and recall or A/B compare it later — real volume/pan/mute/solo/sends.</p></div>
    <div class="ss-toolbar">
      <input id="ms-name" type="text" placeholder="Scene name (e.g. Verse mix)" style="width:180px" />
      <button class="btn" id="ms-save">Save current mix</button>
      <button class="btn ghost" id="ms-refresh">↻</button>
      <span class="hint" id="ms-info">Pick two scenes to compare.</span>
    </div>
    <div id="ms-list" style="margin-top:8px"></div>
    <div id="ms-diff" style="margin-top:10px"></div>`;

  let sel = [];
  const fmt = (ts) => { try { return new Date(ts).toLocaleString(); } catch { return ts; } };

  async function refresh() {
    const r = await exec("list_scenes", {});
    const box = panel.querySelector("#ms-list");
    const items = r.success ? r.data.scenes || [] : [];
    if (!items.length) { box.innerHTML = `<span class="hint">No mix scenes yet — press "Save current mix".</span>`; return; }
    box.innerHTML = "";
    items.forEach((s) => {
      const on = sel.includes(s.id);
      const row = document.createElement("div");
      row.style.cssText = `display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid ${on ? "#6cc6ff" : "#2f2f36"};border-radius:8px;margin-bottom:6px;cursor:pointer;background:#13131a`;
      row.innerHTML = `
        <span style="flex:1;color:#e8e8ea;font-size:12px">${s.name} <span class="hint" style="font-size:10px">${fmt(s.timestamp)}</span></span>
        <button class="btn ghost ms-recall" style="padding:2px 9px;font-size:11px">Recall</button>
        <button class="btn ghost ms-del" style="padding:2px 8px;font-size:11px">✕</button>`;
      row.onclick = (e) => {
        if (e.target.closest(".ms-recall") || e.target.closest(".ms-del")) return;
        const i = sel.indexOf(s.id);
        if (i >= 0) sel.splice(i, 1); else { sel.push(s.id); if (sel.length > 2) sel.shift(); }
        refresh(); if (sel.length === 2) doCompare();
      };
      row.querySelector(".ms-recall").onclick = async () => {
        const rr = await exec("recall_scene", { scene_id: s.id });
        panel.querySelector("#ms-info").textContent = rr.success ? `Recalled "${s.name}" → ${rr.data.tracksApplied} tracks (undoable)` : rr.error;
      };
      row.querySelector(".ms-del").onclick = async () => { await exec("delete_scene", { scene_id: s.id }); sel = sel.filter((x) => x !== s.id); refresh(); };
      box.appendChild(row);
    });
  }
  async function doCompare() {
    const r = await exec("compare_scenes", { scene_a_id: sel[0], scene_b_id: sel[1] });
    const box = panel.querySelector("#ms-diff");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    box.innerHTML = `<div class="hint" style="margin-bottom:6px">"${r.data.sceneA}" vs "${r.data.sceneB}"</div>` +
      (r.data.differences.length ? r.data.differences.map((d) => `<div style="display:flex;gap:8px;padding:4px 10px;background:#2a2316;color:#ffb347;border-radius:6px;margin-bottom:3px;font-size:12px"><span style="flex:1;color:#cfcfd4">${d.track} · ${d.param}</span><span>${d.a} → ${d.b}</span></div>`).join("") : `<span class="hint">No differences.</span>`);
  }
  panel.querySelector("#ms-save").onclick = async () => {
    const name = panel.querySelector("#ms-name").value.trim() || "Mix scene";
    const r = await exec("save_scene", { name });
    panel.querySelector("#ms-info").textContent = r.success ? `Saved "${name}" (${r.data.trackCount} tracks)` : r.error;
    panel.querySelector("#ms-name").value = ""; refresh();
  };
  panel.querySelector("#ms-refresh").onclick = refresh;
  refresh();
};
