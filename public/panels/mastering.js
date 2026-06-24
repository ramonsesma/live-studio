// Rich panel: Gain Staging — per-track level bars from the real analyze_gain_structure
// tool, with one-click auto-stage. Level meters are visual; the autoform showed raw rows.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.mastering = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>📊 Gain Staging</h1><p>Analyze fader levels across tracks and auto-stage headroom. Calls the real tools.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="g-an">Analyze</button>
      <label class="hint">Headroom</label>
      <select id="g-hr"><option>3</option><option selected>6</option><option>9</option><option>12</option></select>
      <span class="hint" id="g-info"></span>
    </div>
    <div id="g-bars" style="margin-top:8px"></div>`;

  function norm(f) { if (f == null) return 0; return Math.max(0, Math.min(1, f <= 1.5 ? f : (f + 60) / 66)); }
  function lvlColor(p) { return p > 0.9 ? "#e24b4a" : p > 0.75 ? "#ffb347" : "#5ad17a"; }

  async function analyze() {
    const r = await exec("analyze_gain_structure", {});
    if (!r.success) { panel.querySelector("#g-info").textContent = r.error; return; }
    const stages = r.data.stages || [];
    panel.querySelector("#g-info").textContent = `${r.data.analyzedTracks} tracks analyzed`;
    const box = panel.querySelector("#g-bars");
    box.innerHTML = "";
    stages.forEach((s) => {
      const p = norm(s.fader);
      const row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:120px 1fr 54px 60px;gap:10px;align-items:center;padding:6px 4px";
      row.innerHTML = `
        <span style="color:${s.muted ? "#777" : "#e8e8ea"};font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.trackName}</span>
        <span style="height:14px;background:#202026;border:1px solid #34343b;border-radius:7px;overflow:hidden">
          <span style="display:block;height:100%;width:${(p * 100).toFixed(0)}%;background:${lvlColor(p)}"></span></span>
        <span class="hint" style="font-size:11px;text-align:right">${s.fader == null ? "—" : Math.round(p * 100) + "%"}</span>
        <button class="btn ghost g-auto" style="padding:3px 6px;font-size:11px">Auto</button>`;
      row.querySelector(".g-auto").onclick = async (e) => {
        const hr = panel.querySelector("#g-hr").value;
        const ar = await exec("auto_gain_stage", { track_index: s.trackIndex, target_headroom: hr });
        if (ar.success) { e.target.textContent = `✓ ${ar.data.finalHeadroom}`; e.target.disabled = true; }
      };
      box.appendChild(row);
    });
  }
  panel.querySelector("#g-an").onclick = analyze;
  analyze();
};
