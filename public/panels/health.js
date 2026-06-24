// Rich panel: Session Health — REAL project scan (missing samples, empty tracks/scenes,
// duplicate names, un-warped audio) with per-issue Fix buttons that mutate the real set.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.health = function (panel, helpers) {
  const exec = helpers.execute;
  const SEV = { error: "#e24b4a", warning: "#ffb347", info: "#6cc6ff" };

  panel.innerHTML = `
    <div class="panel-head"><h1>🩺 Session Health</h1><p>Scans the real project: missing samples, empty tracks/scenes, duplicate names, un-warped audio.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="h-run">Run checks</button>
      <span class="hint" id="h-info"></span>
    </div>
    <div style="display:flex;gap:18px;align-items:flex-start;margin-top:6px">
      <div id="h-gauge" style="flex:0 0 130px"></div>
      <div id="h-list" style="flex:1"></div>
    </div>`;

  function gauge(score) {
    const r = 52, c = 2 * Math.PI * r, off = c * (1 - score / 100);
    const col = score >= 85 ? "#5ad17a" : score >= 60 ? "#ffb347" : "#e24b4a";
    panel.querySelector("#h-gauge").innerHTML = `
      <svg viewBox="0 0 130 130" style="width:130px">
        <circle cx="65" cy="65" r="${r}" fill="none" stroke="#2a2a30" stroke-width="12" />
        <circle cx="65" cy="65" r="${r}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"
          stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 65 65)" />
        <text x="65" y="60" text-anchor="middle" fill="#e8e8ea" font-size="30" font-weight="600">${score}</text>
        <text x="65" y="82" text-anchor="middle" fill="#9a9aa2" font-size="12">health</text>
      </svg>`;
  }

  const FIX_LABEL = { rename_track: "Rename", delete_track: "Delete track", delete_scene: "Delete scene", warp_clip: "Warp" };

  async function run() {
    const r = await exec("run_checks", {});
    if (!r.success) { panel.querySelector("#h-info").textContent = r.error; return; }
    gauge(r.data.score);
    const issues = r.data.issues || [], c = r.data.counts || {};
    panel.querySelector("#h-info").textContent = `${issues.length} issues · ${c.error || 0}🟥 ${c.warning || 0}🟧 ${c.info || 0}🟦 · ${r.data.scanned.tracks} tracks scanned`;
    const box = panel.querySelector("#h-list");
    box.innerHTML = issues.length ? "" : `<div class="hint">No issues found — the project is healthy 🎯</div>`;
    issues.forEach((iss) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid #2f2f36;border-radius:8px;margin-bottom:7px";
      const btn = iss.fix
        ? `<button class="btn ghost h-fix" style="padding:3px 10px">${FIX_LABEL[iss.fix.kind] || "Fix"}</button>`
        : `<span class="hint" style="font-size:11px">manual</span>`;
      row.innerHTML = `
        <span style="width:9px;height:9px;border-radius:50%;background:${SEV[iss.severity] || "#888"};flex:0 0 auto"></span>
        <span style="flex:1;color:#e8e8ea;font-size:13px">${iss.message}</span>
        <span class="hint" style="font-size:11px;text-transform:uppercase">${iss.severity}</span>
        ${btn}`;
      const fixBtn = row.querySelector(".h-fix");
      if (fixBtn) fixBtn.onclick = async (e) => {
        const f = iss.fix;
        const fr = await exec("apply_fix", { kind: f.kind, track_index: f.trackIndex, scene_index: f.sceneIndex, clip_index: f.clipIndex, where: f.where, new_name: f.newName });
        if (fr.success) { e.target.textContent = "✓ Fixed"; e.target.disabled = true; row.style.opacity = "0.55"; }
        else { e.target.textContent = "✗"; panel.querySelector("#h-info").textContent = fr.error; }
      };
      box.appendChild(row);
    });
  }
  panel.querySelector("#h-run").onclick = run;
  run();
};
