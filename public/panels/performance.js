// Rich panel: Performance Pad — live launch surface (track pads, fill triggers, mode,
// loop record) from the real performance tools. A performance surface is tactile, not a form.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.performance = function (panel, helpers) {
  const exec = helpers.execute;
  const FILLS = ["drum_fill", "riser", "sweep", "break", "stutter"];

  panel.innerHTML = `
    <div class="panel-head"><h1>🎤 Performance Pad</h1><p>Live surface: mute pads, fills and loop record. Each pad calls the real tool.</p></div>
    <div class="ss-toolbar">
      <button class="btn ghost" data-mode="session">Session</button>
      <button class="btn ghost" data-mode="arrangement">Arrangement</button>
      <label class="hint">Loop bars</label><input id="p-bars" type="number" min="1" value="4" style="width:50px" />
      <button class="btn" id="p-rec"><i class="ti ti-circle-filled" aria-hidden="true"></i> Loop rec</button>
      <span class="hint" id="p-info"></span>
    </div>
    <div class="hint" style="margin:10px 0 4px">Tracks (click to mute)</div>
    <div id="p-pads" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px"></div>
    <div class="hint" style="margin:14px 0 4px">Fills <input id="p-int" type="range" min="1" max="10" value="5" style="vertical-align:middle;width:90px" /> <span id="p-intv">5</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap" id="p-fills"></div>`;

  async function loadPads() {
    const r = await exec("get_performance_state", {});
    if (!r.success) { panel.querySelector("#p-info").textContent = r.error; return; }
    panel.querySelector("#p-info").textContent = `${r.data.tempo} BPM · ${r.data.armedTracks.length} tracks`;
    const box = panel.querySelector("#p-pads");
    box.innerHTML = "";
    r.data.armedTracks.forEach((t) => {
      const pad = document.createElement("button");
      pad.className = "btn ghost";
      pad.style.cssText = `height:54px;${t.mute ? "background:#ffb347;color:#1a1a1e;" : ""}`;
      pad.innerHTML = `${t.name}${t.armed ? ' <i class="ti ti-circle-filled" style="color:#e24b4a" aria-hidden="true"></i>' : ""}`;
      pad.onclick = async () => {
        const mr = await exec("toggle_mute", { track_index: t.trackIndex });
        const muted = mr.data?.muted;
        pad.style.background = muted ? "#ffb347" : ""; pad.style.color = muted ? "#1a1a1e" : "";
      };
      box.appendChild(pad);
    });
  }

  panel.querySelector("#p-fills").innerHTML = FILLS.map((f) => `<button class="btn ghost" data-fill="${f}">${f.replace("_", " ")}</button>`).join("");
  panel.querySelectorAll("[data-fill]").forEach((b) => {
    b.onclick = async () => {
      const intensity = Number(panel.querySelector("#p-int").value);
      const r = await exec("trigger_fill", { type: b.dataset.fill, intensity });
      panel.querySelector("#p-info").textContent = r.success ? `▶ ${b.dataset.fill} @ ${intensity}` : r.error;
    };
  });
  panel.querySelectorAll("[data-mode]").forEach((b) => {
    b.onclick = async () => {
      const r = await exec("set_performance_mode", { mode: b.dataset.mode });
      panel.querySelectorAll("[data-mode]").forEach((x) => { x.style.background = ""; x.style.color = ""; });
      if (r.success) { b.style.background = "#6cc6ff"; b.style.color = "#1a1a1e"; }
    };
  });
  panel.querySelector("#p-int").oninput = (e) => { panel.querySelector("#p-intv").textContent = e.target.value; };
  panel.querySelector("#p-rec").onclick = async () => {
    const length = Number(panel.querySelector("#p-bars").value);
    const r = await exec("start_loop_recording", { length });
    panel.querySelector("#p-info").textContent = r.success ? `● recording ${length} bars · ${r.data.tracks.length} armed` : r.error;
  };
  loadPads();
};
