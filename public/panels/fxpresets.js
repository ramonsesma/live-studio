// Rich panel: FX Chain Presets — save/browse/apply real per-track device chains, compare two tracks.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.fxpresets = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>💾 FX Chain Presets</h1><p>Save a track's real device chain as a preset, browse/apply saved ones, or compare two tracks.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="fp-track" type="number" value="0" style="width:70px" />
      <button class="btn ghost" id="fp-devices">Show devices</button>
      <input id="fp-name" type="text" placeholder="Preset name" style="width:140px" />
      <button class="btn" id="fp-save">Save preset</button>
      <span class="hint" id="fp-info"></span>
    </div>
    <div id="fp-devlist" style="margin:8px 0;font-size:12px;color:#9a9aa2"></div>
    <div class="ss-toolbar">
      <input id="fp-search" type="text" placeholder="Search presets…" style="width:160px" />
      <button class="btn ghost" id="fp-searchgo">Search</button>
    </div>
    <div id="fp-list" style="margin-top:8px"></div>
    <div class="ss-toolbar" style="margin-top:14px">
      <label class="hint">Compare track A</label><input id="fp-cmpa" type="number" value="0" style="width:60px" />
      <label class="hint">vs B</label><input id="fp-cmpb" type="number" value="1" style="width:60px" />
      <button class="btn ghost" id="fp-compare">Compare</button>
    </div>
    <div id="fp-cmpout" style="margin-top:8px"></div>`;

  panel.querySelector("#fp-devices").onclick = async () => {
    const r = await exec("get_track_devices", { track_index: Number(panel.querySelector("#fp-track").value)||0 });
    panel.querySelector("#fp-devlist").innerHTML = r.success ? `${r.data.trackName}: ${r.data.devices.map((d) => d.name).join(", ") || "(no devices)"}` : r.error;
  };
  panel.querySelector("#fp-save").onclick = async () => {
    const name = panel.querySelector("#fp-name").value.trim();
    if (!name) return;
    const r = await exec("save_fx_preset", { name, track_index: Number(panel.querySelector("#fp-track").value)||0 });
    panel.querySelector("#fp-info").textContent = r.success ? `Saved "${name}" (${r.data.deviceCount} devices)` : r.error;
    panel.querySelector("#fp-name").value = ""; search();
  };
  async function search() {
    const query = panel.querySelector("#fp-search").value.trim();
    const r = await exec("search_presets", { query: query || undefined });
    const box = panel.querySelector("#fp-list");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    box.innerHTML = r.data.presets.length ? r.data.presets.map((p) => `
      <div style="display:flex;align-items:center;gap:10px;border:1px solid #2f2f36;border-radius:7px;padding:6px 10px;background:#13131a;margin-bottom:5px">
        <span style="flex:1;color:#e8e8ea;font-size:12px">${p.name} <span class="hint" style="font-size:10px">${p.category} · ${(p.devices||[]).join(", ")}</span></span>
        <button class="btn ghost fp-apply" data-name="${p.name}" style="padding:2px 9px;font-size:11px">Apply</button>
      </div>`).join("") : `<span class="hint">No presets found.</span>`;
    box.querySelectorAll(".fp-apply").forEach((b) => b.onclick = async () => {
      const r = await exec("apply_fx_preset", { preset_name: b.dataset.name, track_index: Number(panel.querySelector("#fp-track").value)||0 });
      panel.querySelector("#fp-info").textContent = r.success ? `Applied: ${r.data.devices.join(", ")}` : r.error;
    });
  }
  panel.querySelector("#fp-searchgo").onclick = search;
  panel.querySelector("#fp-compare").onclick = async () => {
    const r = await exec("compare_tracks", { track_a: Number(panel.querySelector("#fp-cmpa").value)||0, track_b: Number(panel.querySelector("#fp-cmpb").value)||0 });
    const box = panel.querySelector("#fp-cmpout");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    box.innerHTML = `<div class="hint" style="margin-bottom:4px">${r.data.trackA} vs ${r.data.trackB}</div>
      <div style="font-size:12px;color:#e8e8ea">Shared: ${r.data.sharedDevices.join(", ")||"none"}</div>
      <div style="font-size:12px;color:#6cc6ff">Only ${r.data.trackA}: ${r.data.uniqueToA.join(", ")||"none"}</div>
      <div style="font-size:12px;color:#ffb347">Only ${r.data.trackB}: ${r.data.uniqueToB.join(", ")||"none"}</div>`;
  };
  search();
};
