// Rich panel: Device Remote — a generic remote control for any device's parameters (native
// Live devices AND Max for Live / third-party devices already on the track). List devices,
// see every parameter with its live value, drag to set it, reset to default, and save/load
// full snapshots — the practical way to drive an M4L instrument's macros from Live Studio.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.devremote = function (panel, helpers) {
  const exec = helpers.execute;
  let curTrack = 0, curDevice = 0, curParams = [];

  panel.innerHTML = `
    <div class="panel-head"><h1>🎛️ Device Remote</h1><p>Remote-control every parameter of any device already on a track — including Max for Live instruments. The SDK can't install a device for you, but once it's there, we can drive it.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="dr-trk" type="number" value="0" style="width:50px" />
      <button class="btn ghost" id="dr-listdev"><i class="ti ti-refresh" aria-hidden="true"></i> List devices</button>
      <span class="hint" id="dr-devinfo"></span>
    </div>
    <div id="dr-devlist" style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px"></div>
    <div class="ss-toolbar" style="margin-top:4px">
      <button class="btn" id="dr-load"><i class="ti ti-plug-connected" aria-hidden="true"></i> Load parameters</button>
      <label class="hint">Snapshot name</label><input id="dr-sname" type="text" placeholder="e.g. Lead patch A" style="width:160px" />
      <button class="btn ghost" id="dr-save"><i class="ti ti-device-floppy" aria-hidden="true"></i> Save snapshot</button>
      <span class="hint" id="dr-info"></span>
    </div>
    <div id="dr-params" style="margin-top:12px;display:flex;flex-direction:column;gap:7px"></div>
    <div class="ss-toolbar" style="margin-top:14px"><span style="font-size:12px;color:#82c98a">Saved snapshots</span><button class="btn ghost" id="dr-refresh-snaps"><i class="ti ti-refresh" aria-hidden="true"></i></button><span class="hint" style="font-size:11px">pick two to compare</span></div>
    <div id="dr-snaplist" style="margin-top:6px;display:flex;flex-direction:column;gap:5px"></div>
    <div id="dr-cmp" style="margin-top:8px"></div>`;

  let cmpSel = [];

  function paramRow(p) {
    const frac = (p.max - p.min) ? (p.value - p.min) / (p.max - p.min) : 0;
    if (p.options) {
      return `<div style="display:flex;align-items:center;gap:10px">
        <span style="width:160px;font-size:12px;color:#e8e8ea;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.name}">${p.name}</span>
        <select class="dr-pinput" data-i="${p.index}" style="flex:1">${p.options.map((o, oi) => `<option value="${oi}"${oi === Math.round(p.value) ? " selected" : ""}>${o}</option>`).join("")}</select>
        <button class="btn ghost dr-reset" data-i="${p.index}" style="padding:2px 8px" title="Reset to default">↺</button>
      </div>`;
    }
    return `<div style="display:flex;align-items:center;gap:10px">
      <span style="width:160px;font-size:12px;color:#e8e8ea;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.name}">${p.name}</span>
      <input class="dr-pinput" data-i="${p.index}" type="range" min="${p.min}" max="${p.max}" step="${p.quantized ? 1 : (p.max - p.min) / 500}" value="${p.value}" style="flex:1" />
      <span class="hint dr-pv" style="width:60px;text-align:right">${p.value.toFixed(p.quantized ? 0 : 2)}</span>
      <button class="btn ghost dr-reset" data-i="${p.index}" style="padding:2px 8px" title="Reset to default">↺</button>
    </div>`;
  }
  function renderParams() {
    panel.querySelector("#dr-params").innerHTML = curParams.length ? curParams.map(paramRow).join("") : `<div class="hint" style="padding:8px">No parameters loaded — pick a track/device and click Load.</div>`;
    panel.querySelectorAll(".dr-pinput").forEach((el) => {
      const commit = async () => { const i = +el.dataset.i; const val = el.tagName === "SELECT" ? +el.value : +el.value; const r = await exec("set_param", { track_index: curTrack, device_index: curDevice, param_index: i, value: val }); if (r.success) { curParams[i].value = r.data.value; const pv = el.parentElement.querySelector(".dr-pv"); if (pv) pv.textContent = r.data.value.toFixed(curParams[i].quantized ? 0 : 2); } };
      if (el.tagName === "SELECT") el.onchange = commit; else { el.oninput = () => { const pv = el.parentElement.querySelector(".dr-pv"); if (pv) pv.textContent = (+el.value).toFixed(curParams[+el.dataset.i].quantized ? 0 : 2); }; el.onchange = commit; }
    });
    panel.querySelectorAll(".dr-reset").forEach((b) => b.onclick = async () => { const i = +b.dataset.i; const r = await exec("reset_param", { track_index: curTrack, device_index: curDevice, param_index: i }); if (r.success) { curParams[i].value = r.data.value; renderParams(); } });
  }
  async function listDevices() {
    curTrack = +panel.querySelector("#dr-trk").value;
    const r = await exec("list_devices", { track_index: curTrack });
    if (!r.success) { panel.querySelector("#dr-devinfo").textContent = r.error || "Open a track in Live"; panel.querySelector("#dr-devlist").innerHTML = ["EQ Eight","Reverb","Max Instrument (example)"].map((n, i) => `<span style="font-size:11px;border:1px solid #2f2f36;background:#17171d;color:#9a9aa3;border-radius:6px;padding:3px 9px">${i}: ${n} (demo)</span>`).join(""); return; }
    panel.querySelector("#dr-devinfo").textContent = `${r.data.trackName} · ${r.data.deviceCount} devices`;
    panel.querySelector("#dr-devlist").innerHTML = r.data.devices.map((d) => `<span class="dr-devchip" data-i="${d.index}" style="cursor:pointer;font-size:11px;border:1px solid ${d.index === curDevice ? "#4a3a66" : "#2f2f36"};background:${d.index === curDevice ? "#211b2e" : "#17171d"};color:${d.index === curDevice ? "#c4a4e8" : "#c8c8cf"};border-radius:6px;padding:4px 10px">${d.index}: ${d.name} <span style="opacity:.6">(${d.paramCount})</span></span>`).join("") || `<div class="hint">No devices on this track.</div>`;
    panel.querySelectorAll(".dr-devchip").forEach((c) => c.onclick = () => { curDevice = +c.dataset.i; listDevices(); loadParams(); });
  }
  async function loadParams() {
    const r = await exec("get_params", { track_index: curTrack, device_index: curDevice });
    if (!r.success) { panel.querySelector("#dr-info").textContent = r.error || "Pick a device first"; return; }
    curParams = r.data.params;
    panel.querySelector("#dr-info").textContent = `${r.data.deviceName} · ${r.data.paramCount} params`;
    renderParams();
  }
  async function saveSnapshot() {
    const name = panel.querySelector("#dr-sname").value || "Untitled";
    const r = await exec("save_snapshot", { track_index: curTrack, device_index: curDevice, name });
    panel.querySelector("#dr-info").textContent = r.success ? `Saved · ${r.data.paramCount} params` : (r.error || "Save failed");
    refreshSnaps();
  }
  async function refreshSnaps() {
    const r = await exec("list_snapshots", {});
    const snaps = r.success ? r.data.snapshots : [];
    cmpSel = cmpSel.filter((id) => snaps.some((s) => s.id === id));
    panel.querySelector("#dr-snaplist").innerHTML = snaps.length ? snaps.map((s) => { const on = cmpSel.includes(s.id); return `
      <div class="dr-snaprow" data-id="${s.id}" style="display:flex;align-items:center;gap:10px;border:1px solid ${on ? "#6cc6ff" : "#2f2f36"};border-radius:7px;padding:7px 10px;background:#13131a;cursor:pointer">
        <span style="width:12px;height:12px;border-radius:3px;border:2px solid ${on ? "#6cc6ff" : "#444"};background:${on ? "#6cc6ff" : "transparent"}"></span>
        <span style="flex:1;color:#e8e8ea;font-size:12px">${s.name} <span class="hint" style="font-size:10px">${s.deviceName} · track ${s.trackIndex} · ${s.paramCount} params</span></span>
        <button class="btn ghost dr-loadsnap" data-id="${s.id}" style="padding:2px 8px"><i class="ti ti-download"></i></button>
        <button class="btn ghost dr-delsnap" data-id="${s.id}" style="padding:2px 8px"><i class="ti ti-trash"></i></button>
      </div>`; }).join("") : `<div class="hint" style="padding:8px">No saved snapshots yet.</div>`;
    panel.querySelectorAll(".dr-snaprow").forEach((row) => row.onclick = (e) => {
      if (e.target.closest(".dr-loadsnap") || e.target.closest(".dr-delsnap")) return;
      const id = row.dataset.id, i = cmpSel.indexOf(id);
      if (i >= 0) cmpSel.splice(i, 1); else { cmpSel.push(id); if (cmpSel.length > 2) cmpSel.shift(); }
      refreshSnaps(); if (cmpSel.length === 2) doCompare();
    });
    panel.querySelectorAll(".dr-loadsnap").forEach((b) => b.onclick = async () => { const r = await exec("load_snapshot", { id: b.dataset.id }); panel.querySelector("#dr-info").textContent = r.success ? `Restored ${r.data.restored}/${r.data.total} params` : (r.error || "Load failed"); loadParams(); });
    panel.querySelectorAll(".dr-delsnap").forEach((b) => b.onclick = async () => { await exec("delete_snapshot", { id: b.dataset.id }); refreshSnaps(); });
    if (cmpSel.length < 2) panel.querySelector("#dr-cmp").innerHTML = "";
  }
  async function doCompare() {
    const r = await exec("compare_snapshots", { id_a: cmpSel[0], id_b: cmpSel[1] });
    const box = panel.querySelector("#dr-cmp");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    box.innerHTML = `<div style="font-size:12px;color:#9a9aa2;margin-bottom:6px">"${r.data.nameA}" vs "${r.data.nameB}" — ${r.data.paramsDifferent}/${r.data.paramsCompared} params differ</div>` +
      (r.data.diffs.length ? `<div style="font-family:var(--font-mono);font-size:12px;border:1px solid #2f2f36;border-radius:8px;overflow:hidden">${r.data.diffs.map((d) => `<div style="display:flex;gap:8px;padding:4px 10px;background:#2a2316;color:#ffb347"><span style="flex:1;color:#cfcfd4">${d.param}</span><span>${d.a} → ${d.b}</span></div>`).join("")}</div>` : `<div class="hint">identical</div>`);
  }
  panel.querySelector("#dr-listdev").onclick = listDevices;
  panel.querySelector("#dr-load").onclick = loadParams;
  panel.querySelector("#dr-save").onclick = saveSnapshot;
  panel.querySelector("#dr-refresh-snaps").onclick = refreshSnaps;
  listDevices(); refreshSnaps();
};
