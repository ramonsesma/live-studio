// Panel rico: Drum Map Editor — rejilla de pads con color y nota.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.drummap = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🥁 Drum Map Editor</h1><p>Pads del drum rack con su nota MIDI, nombre y color. Carga un preset o lee el rack.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Pista</label><input id="dm-track" type="number" value="0" style="width:80px" />
      <button class="btn" id="dm-load">Leer rack</button>
      <label class="hint">Preset</label>
      <select id="dm-preset"><option>GM Standard</option><option>808 Kit</option><option>909 Kit</option><option>Acoustic</option><option>Electronic</option></select>
      <button class="btn ghost" id="dm-loadpreset">Cargar preset</button>
    </div>
    <div id="dm-grid" class="dm-grid"><span class="hint">Pulsa «Leer rack».</span></div>
    <div class="result" id="dm-out" style="display:none"></div>`;

  const out = panel.querySelector("#dm-out");
  function show(r){ out.style.display="block"; out.className="result "+(r.success?"ok":"err"); out.textContent=JSON.stringify(r.data||r,null,2); }

  async function load() {
    const track_index = Number(panel.querySelector("#dm-track").value) || 0;
    const r = await exec("get_drum_rack", { track_index });
    const grid = panel.querySelector("#dm-grid");
    grid.innerHTML = "";
    if (!r.success) { grid.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    for (const p of r.data.pads) {
      const pad = document.createElement("div");
      pad.className = "dm-pad";
      pad.style.borderColor = p.color;
      pad.innerHTML = `<span class="dm-swatch" style="background:${p.color}"></span><span class="dm-padname">${p.name}</span><span class="hint">${p.noteName} · ${p.note}</span>`;
      pad.onclick = () => show({ success: true, data: p });
      grid.appendChild(pad);
    }
  }
  panel.querySelector("#dm-load").onclick = load;
  panel.querySelector("#dm-loadpreset").onclick = async () => {
    show(await exec("load_drum_map_preset", { preset: panel.querySelector("#dm-preset").value }));
  };
  load();
};
