// Rich panel: Rack Builder — chain tree + 8 macro knobs from the real get_rack_structure
// tool. A rack is a structure of chains and macros, not a flat form.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.rackbuilder = function (panel, helpers) {
  const exec = helpers.execute;
  const api = helpers.api;

  panel.innerHTML = `
    <div class="panel-head"><h1>🧱 Rack Builder</h1><p>Build a rack, add chains and see the 8 macros. Calls the real tools.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="rb-trk" type="number" min="0" value="0" style="width:54px" />
      <select id="rb-type"><option value="instrument">instrument</option><option value="effect">effect</option><option value="drum">drum</option></select>
      <button class="btn" id="rb-create">Create rack</button>
      <button class="btn ghost" id="rb-load">Load structure</button>
      <button class="btn ghost" id="rb-chain">+ Chain</button>
      <button class="btn ghost" id="rb-save">Save macros</button>
      <span class="hint" id="rb-info"></span>
    </div>
    <div id="rb-chains" style="margin-top:8px"></div>
    <div id="rb-macros" style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:14px"></div>`;

  function knob(m) {
    const a = -120 + (m.value / 127) * 240;
    return `<div style="text-align:center">
      <svg viewBox="0 0 56 56" style="width:48px">
        <circle cx="28" cy="28" r="22" fill="#202026" stroke="#3a3a42" stroke-width="2" />
        <line x1="28" y1="28" x2="${28 + 16 * Math.sin(a * Math.PI / 180)}" y2="${28 - 16 * Math.cos(a * Math.PI / 180)}" stroke="#ffb347" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="28" cy="28" r="3" fill="#ffb347" />
      </svg>
      <div class="hint" style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.name}</div>
    </div>`;
  }

  async function load() {
    const track_index = Number(panel.querySelector("#rb-trk").value);
    const r = await exec("get_rack_structure", { track_index, rack_index: 0 });
    if (!r.success) { panel.querySelector("#rb-info").textContent = r.error; return; }
    panel.querySelector("#rb-info").textContent = `${r.data.trackName} · ${r.data.chains.length} chains`;
    panel.querySelector("#rb-chains").innerHTML = r.data.chains.map((c) => `
      <div style="border:1px solid #2f2f36;border-radius:8px;padding:8px 10px;margin-bottom:7px">
        <div style="color:#e8e8ea;font-size:13px;display:flex;justify-content:space-between">
          <span><i class="ti ti-stack-2" aria-hidden="true"></i> ${c.name}</span>
          <span class="hint" style="font-size:11px">${c.keyRange} · vel ${c.velocityRange}</span></div>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
          ${c.devices.map((d) => `<span style="background:#26262b;border:1px solid #3a3a42;border-radius:6px;padding:2px 8px;font-size:11px;color:#cfcfd4">${d}</span>`).join("")}
        </div></div>`).join("");
    panel.querySelector("#rb-macros").innerHTML = r.data.macros.map(knob).join("");
  }
  panel.querySelector("#rb-create").onclick = async () => {
    const track_index = Number(panel.querySelector("#rb-trk").value);
    const r = await exec("create_rack", { track_index, rack_type: panel.querySelector("#rb-type").value, name: "Rack" });
    panel.querySelector("#rb-info").textContent = r.success ? `rack created (${r.data.macroCount} macros)` : r.error;
    if (r.success) load();
  };
  panel.querySelector("#rb-load").onclick = load;
  panel.querySelector("#rb-chain").onclick = async () => {
    const track_index = Number(panel.querySelector("#rb-trk").value);
    const r = await exec("add_chain", { track_index, rack_index: 0, name: "Chain " + (Math.floor(Math.random() * 90) + 2) });
    panel.querySelector("#rb-info").textContent = r.success ? `chain added: ${r.data.chainName}` : r.error;
    if (r.success) load();
  };
  panel.querySelector("#rb-save").onclick = async () => {
    const track_index = Number(panel.querySelector("#rb-trk").value);
    const r = await api.post("/api/execute", { name: "macros__save_macro_preset", args: { name: "Macro preset", track_index } });
    panel.querySelector("#rb-info").textContent = r.success ? `saved ${r.data.macroCount}-macro preset` : r.error;
  };
  load();
};
