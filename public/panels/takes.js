// Rich panel: Takes & Comping — real take lanes (Track.takeLanes). Rating/selection used to be
// shown here but those fields were fake and removed from the backend; select_best_takes and
// comp_from_takes are honestly advisory (no audio-quality-analysis or splicing API exists).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.takes = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎙️ Takes & Comping</h1><p>Real take lanes for a track. Arm for recording; auto-select/comp are advisory — the SDK can't analyze or splice audio.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="tk-track" type="number" value="0" style="width:70px" />
      <button class="btn" id="tk-arm"><i class="ti ti-microphone" aria-hidden="true"></i> Arm for recording</button>
      <button class="btn ghost" id="tk-load">List takes</button>
      <button class="btn ghost" id="tk-best">Auto-select best</button>
      <button class="btn ghost" id="tk-comp">Comp from takes</button>
      <span class="hint" id="tk-info"></span>
    </div>
    <div id="tk-lanes" class="tk-lanes"><span class="hint">Click "List takes".</span></div>
    <div id="tk-advisory" style="margin-top:8px"></div>`;

  const ti = () => Number(panel.querySelector("#tk-track").value) || 0;
  function setInfo(t) { panel.querySelector("#tk-info").textContent = t; }
  function advisory(r) {
    const box = panel.querySelector("#tk-advisory");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    box.innerHTML = r.data.advisory ? `<div class="result" style="border-color:#ffb347">${r.data.note}</div>` : "";
  }

  async function load() {
    const r = await exec("list_takes", { track_index: ti() });
    const box = panel.querySelector("#tk-lanes");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    setInfo(`${r.data.trackName} · ${r.data.takeCount} take lane(s)`);
    if (!r.data.takes.length) { box.innerHTML = `<span class="hint">No take lanes on this track yet.</span>`; return; }
    for (const t of r.data.takes) {
      const lane = document.createElement("div");
      lane.className = "tk-lane";
      lane.innerHTML = `
        <span class="tk-name">${t.name}</span>
        <div class="tk-clip" style="background:#6cc6ff22;border-color:#6cc6ff"></div>
        <span class="hint">${t.clipCount} clip${t.clipCount === 1 ? "" : "s"}</span>`;
      box.appendChild(lane);
    }
  }
  panel.querySelector("#tk-arm").onclick = async () => { const r = await exec("prepare_recording", { track_index: ti() }); setInfo(r.success ? `Armed: ${r.data.trackName}` : r.error); };
  panel.querySelector("#tk-load").onclick = load;
  panel.querySelector("#tk-best").onclick = async () => advisory(await exec("select_best_takes", { track_index: ti(), algorithm: "balanced" }));
  panel.querySelector("#tk-comp").onclick = async () => advisory(await exec("comp_from_takes", { track_index: ti() }));
  load();
};
