// Rich panel: Param Diff & Outlier — diff the same device across N tracks, flag outliers,
// normalize to the mean. Sonic QA. Demo shows a canned EQ-across-tracks comparison.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.paramdiff = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>🔬 Param Diff & Outlier</h1><p>Compares the same device across tracks and flags the one that's off — the sonic counterpart to Session Health.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Tracks</label><input id="pd-trk" placeholder="all (or 0,1,2)" style="width:120px" />
      <label class="hint">Device</label><input id="pd-dev" placeholder="any (e.g. EQ Eight)" style="width:130px" />
      <button class="btn" id="pd-go"><i class="ti ti-microscope" aria-hidden="true"></i> Diff</button>
      <span class="hint" id="pd-info"></span>
    </div>
    <div id="pd-out"></div>`;

  function render(groups, demo) {
    panel.querySelector("#pd-info").textContent = demo ? "Demo — EQ Eight across 4 tracks" : `${groups.length} device group(s) with outliers`;
    const box = panel.querySelector("#pd-out");
    if (!groups.length) { box.innerHTML = `<div class="hint" style="margin-top:8px">No outliers — the devices are consistent 🎯</div>`; return; }
    box.innerHTML = groups.map((g) => `
      <div style="border:1px solid #2f2f36;border-radius:8px;padding:10px;margin-top:8px">
        <div style="color:#e8e8ea;font-size:13px;margin-bottom:8px"><i class="ti ti-stack-2" aria-hidden="true"></i> ${g.deviceName} <span class="hint">· ${g.trackCount} tracks · ${g.outlierParams} outlier param(s)</span></div>
        ${g.params.map((p) => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #232329">
            <span style="width:120px;font-size:12px;color:#cfcfd4">${p.name}</span>
            <span style="flex:1;display:flex;gap:5px;flex-wrap:wrap">${p.values.map((v) => `<span style="font-size:11px;padding:2px 7px;border-radius:5px;background:${p.outliers.includes(v.trackIndex) ? "#3a1f22" : "#26262b"};border:1px solid ${p.outliers.includes(v.trackIndex) ? "#e24b4a66" : "#3a3a42"};color:${p.outliers.includes(v.trackIndex) ? "#ff9b9b" : "#cfcfd4"}">trk ${v.trackIndex}: ${v.value}</span>`).join("")}</span>
            <span class="hint" style="font-size:11px">µ ${p.mean}</span>
            <button class="btn ghost pd-norm" data-dev="${g.deviceName}" data-param="${p.name}" style="padding:2px 9px;font-size:11px">Normalize</button>
          </div>`).join("")}
      </div>`).join("");
    panel.querySelectorAll(".pd-norm").forEach((b) => { b.onclick = async () => {
      const r = await exec("normalize_param", { track_indices: panel.querySelector("#pd-trk").value || "all", device_name: b.dataset.dev, param_name: b.dataset.param });
      if (r.success) { b.textContent = "✓ µ " + r.data.mean; b.disabled = true; } else panel.querySelector("#pd-info").textContent = r.error;
    }; });
  }

  function demo() {
    render([{ deviceName: "EQ Eight", trackCount: 4, outlierParams: 1, params: [
      { name: "1 Gain A", mean: 0.51, values: [{ trackIndex: 0, value: 0.5 }, { trackIndex: 1, value: 0.52 }, { trackIndex: 2, value: 0.5 }, { trackIndex: 3, value: 0.74 }], outliers: [3] },
    ] }, { deviceName: "Compressor", trackCount: 4, outlierParams: 1, params: [
      { name: "Threshold", mean: 0.62, values: [{ trackIndex: 0, value: 0.6 }, { trackIndex: 1, value: 0.61 }, { trackIndex: 2, value: 0.85 }, { trackIndex: 3, value: 0.62 }], outliers: [2] },
    ] }], true);
  }

  async function go() {
    const r = await exec("diff_devices", { track_indices: panel.querySelector("#pd-trk").value || "all", device_name: panel.querySelector("#pd-dev").value || undefined });
    if (r.success && r.data.groups.length) render(r.data.groups, false);
    else if (r.success) { panel.querySelector("#pd-info").textContent = `${r.data.scannedTracks} tracks · no outliers`; panel.querySelector("#pd-out").innerHTML = `<div class="hint" style="margin-top:8px">No outliers found 🎯</div>`; }
    else demo();
  }
  panel.querySelector("#pd-go").onclick = go;
  demo();
};
