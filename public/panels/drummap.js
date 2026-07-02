// Rich panel: Drum Map Editor — grid of pads with color and note. Clicking a pad now retunes it
// for real (DrumChain.receivingNote via set_drum_mapping). Presets are advisory — there's no API
// to load a .adg drum-rack preset file.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.drummap = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🥁 Drum Map Editor</h1><p>Drum rack pads with their real MIDI note. Click a pad to retune it.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="dm-track" type="number" value="0" style="width:80px" />
      <button class="btn" id="dm-load">Read rack</button>
      <label class="hint">Preset (advisory — no API to load .adg files)</label>
      <select id="dm-preset"><option>GM Standard</option><option>808 Kit</option><option>909 Kit</option><option>Acoustic</option><option>Electronic</option></select>
      <button class="btn ghost" id="dm-loadpreset">Load preset</button>
      <span class="hint" id="dm-info"></span>
    </div>
    <div id="dm-grid" class="dm-grid"><span class="hint">Click "Read rack".</span></div>
    <div id="dm-editor" style="display:none;margin-top:10px;align-items:center;gap:10px" class="ss-toolbar">
      <span class="hint" id="dm-editing"></span>
      <label class="hint">New note (0-127)</label><input id="dm-newnote" type="number" min="0" max="127" style="width:70px" />
      <button class="btn" id="dm-apply">Retune pad</button>
      <button class="btn ghost" id="dm-cancel">Cancel</button>
    </div>`;

  let selectedPad = null;
  function setInfo(t) { panel.querySelector("#dm-info").textContent = t; }
  const ti = () => Number(panel.querySelector("#dm-track").value) || 0;

  async function load() {
    const r = await exec("get_drum_rack", { track_index: ti() });
    const grid = panel.querySelector("#dm-grid");
    grid.innerHTML = "";
    closeEditor();
    if (!r.success) { grid.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    setInfo(`${r.data.deviceName} on "${r.data.trackName}" · ${r.data.padCount} pads`);
    for (const p of r.data.pads) {
      const pad = document.createElement("div");
      pad.className = "dm-pad";
      pad.style.borderColor = p.color;
      pad.style.cursor = "pointer";
      pad.innerHTML = `<span class="dm-swatch" style="background:${p.color}"></span><span class="dm-padname">${p.name}</span><span class="hint">${p.noteName} · ${p.note}</span>`;
      pad.onclick = () => openEditor(p);
      grid.appendChild(pad);
    }
  }
  function openEditor(p) {
    selectedPad = p;
    panel.querySelector("#dm-editor").style.display = "flex";
    panel.querySelector("#dm-editing").textContent = `Editing pad ${p.index}: ${p.name} (${p.noteName})`;
    panel.querySelector("#dm-newnote").value = p.note;
  }
  function closeEditor() { selectedPad = null; panel.querySelector("#dm-editor").style.display = "none"; }
  panel.querySelector("#dm-load").onclick = load;
  panel.querySelector("#dm-cancel").onclick = closeEditor;
  panel.querySelector("#dm-apply").onclick = async () => {
    if (!selectedPad) return;
    const note = Number(panel.querySelector("#dm-newnote").value);
    const r = await exec("set_drum_mapping", { track_index: ti(), pad_index: selectedPad.index, note });
    setInfo(r.success ? `Pad ${selectedPad.index}: ${r.data.previousNote} → ${r.data.newNote} (${r.data.noteName})` : r.error);
    if (r.success) load();
  };
  panel.querySelector("#dm-loadpreset").onclick = async () => {
    const r = await exec("load_drum_map_preset", { preset: panel.querySelector("#dm-preset").value });
    setInfo(r.success && r.data.advisory ? r.data.note : (r.success ? "Loaded" : r.error));
  };
  load();
};
