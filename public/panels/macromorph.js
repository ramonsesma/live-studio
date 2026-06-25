// Rich panel: Macro Snapshot Morph — capture a device's parameter state and morph (lerp)
// between two snapshots. The slider lerps the knobs live; releasing writes via setValue.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.macromorph = function (panel, helpers) {
  const api = helpers.api;
  const mm = (body) => api.post("/api/macromorph", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>🎚️ Macro Snapshot Morph</h1><p>Capture two device states, then slide between them — preset morphing Live doesn't have.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="mm-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Device</label><input id="mm-dev" type="number" value="0" style="width:50px" />
      <button class="btn" id="mm-read"><i class="ti ti-refresh" aria-hidden="true"></i> Read device</button>
      <input id="mm-label" placeholder="snapshot name" style="width:130px" />
      <button class="btn ghost" id="mm-cap">Capture</button>
      <span class="hint" id="mm-info"></span>
    </div>
    <div id="mm-knobs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px;margin-top:8px"></div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap">
      <span class="hint">A</span><select id="mm-a" style="width:130px"></select>
      <input id="mm-slider" type="range" min="0" max="100" value="0" style="flex:1;min-width:160px" />
      <select id="mm-b" style="width:130px"></select><span class="hint">B</span>
      <span class="hint" id="mm-t">0%</span>
    </div>`;

  let live = null, snapA = null, snapB = null, demo = false;

  function knobs(params, base) {
    panel.querySelector("#mm-knobs").innerHTML = params.map((p) => {
      const frac = (p.max - p.min) ? (p.value - p.min) / (p.max - p.min) : 0;
      const a = -135 + frac * 270, moved = base && Math.abs(p.value - (base.get(p.name) ?? p.value)) > 1e-6;
      return `<div style="text-align:center">
        <svg viewBox="0 0 54 54" style="width:46px"><circle cx="27" cy="27" r="21" fill="#202026" stroke="${moved ? "#ffb347" : "#3a3a42"}" stroke-width="2" />
        <line x1="27" y1="27" x2="${27 + 15 * Math.sin((a * Math.PI) / 180)}" y2="${27 - 15 * Math.cos((a * Math.PI) / 180)}" stroke="#ffb347" stroke-width="2.4" stroke-linecap="round" /><circle cx="27" cy="27" r="2.6" fill="#ffb347" /></svg>
        <div class="hint" style="font-size:9.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div></div>`;
    }).join("");
  }

  function lerpParams(t) {
    if (!snapA || !snapB) return;
    const bm = Object.fromEntries(snapB.params.map((p) => [p.name, p]));
    const out = snapA.params.map((p) => { const b = bm[p.name] || p; let v = p.value + (b.value - p.value) * t; if (p.quantized) v = Math.round(v); return { name: p.name, value: v, min: p.min, max: p.max }; });
    knobs(out, null);
  }

  function fillSelects(list) {
    const opt = (s) => `<option value="${s.id}">${s.label}</option>`;
    panel.querySelector("#mm-a").innerHTML = list.map(opt).join("");
    panel.querySelector("#mm-b").innerHTML = list.map(opt).join("");
    if (list[0]) panel.querySelector("#mm-a").value = list[0].id;
    if (list[1]) panel.querySelector("#mm-b").value = list[1].id;
    loadAB();
  }
  async function loadAB() {
    if (demo) return;
    const ti = Number(panel.querySelector("#mm-trk").value), di = Number(panel.querySelector("#mm-dev").value);
    const a = await mm({ action: "get", trackIndex: ti, deviceIndex: di, id: panel.querySelector("#mm-a").value });
    const b = await mm({ action: "get", trackIndex: ti, deviceIndex: di, id: panel.querySelector("#mm-b").value });
    if (a.success) snapA = a.data; if (b.success) snapB = b.data;
  }
  async function refreshList() {
    const r = await mm({ action: "list", trackIndex: Number(panel.querySelector("#mm-trk").value), deviceIndex: Number(panel.querySelector("#mm-dev").value) });
    if (r.success && r.data.snapshots.length) fillSelects(r.data.snapshots);
  }

  async function read() {
    const r = await mm({ action: "read", trackIndex: Number(panel.querySelector("#mm-trk").value), deviceIndex: Number(panel.querySelector("#mm-dev").value) });
    if (r.success) { demo = false; live = r.data; knobs(r.data.params, null); panel.querySelector("#mm-info").textContent = `${r.data.deviceName} · ${r.data.paramCount} params`; refreshList(); }
    else loadDemo();
  }
  function loadDemo() {
    demo = true;
    const mk = (vals) => ({ params: vals.map((v, i) => ({ name: "Macro " + (i + 1), value: v, min: 0, max: 127, quantized: false })) });
    snapA = mk([10, 30, 50, 70, 90, 110, 40, 80]); snapB = mk([100, 20, 60, 5, 127, 30, 90, 15]);
    panel.querySelector("#mm-a").innerHTML = `<option>A: warm</option>`; panel.querySelector("#mm-b").innerHTML = `<option>B: bright</option>`;
    knobs(snapA.params, null); panel.querySelector("#mm-info").textContent = "Demo — drag the slider to morph A → B";
  }

  panel.querySelector("#mm-read").onclick = read;
  panel.querySelector("#mm-cap").onclick = async () => {
    const r = await mm({ action: "capture", trackIndex: Number(panel.querySelector("#mm-trk").value), deviceIndex: Number(panel.querySelector("#mm-dev").value), label: panel.querySelector("#mm-label").value || "snapshot" });
    panel.querySelector("#mm-info").textContent = r.success ? `Captured "${r.data.id}" (${r.data.paramCount} params)` : r.error;
    panel.querySelector("#mm-label").value = ""; refreshList();
  };
  panel.querySelectorAll("#mm-a,#mm-b").forEach((el) => { el.onchange = loadAB; });
  const slider = panel.querySelector("#mm-slider");
  slider.oninput = () => { const t = slider.value / 100; panel.querySelector("#mm-t").textContent = slider.value + "%"; lerpParams(t); };
  slider.onchange = async () => { if (demo) return; await mm({ action: "morph", trackIndex: Number(panel.querySelector("#mm-trk").value), deviceIndex: Number(panel.querySelector("#mm-dev").value), idA: panel.querySelector("#mm-a").value, idB: panel.querySelector("#mm-b").value, t: slider.value / 100 }); };
  read();
};
