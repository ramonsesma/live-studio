// Panel rico: Modulation Matrix — matriz source→target con depth y enable.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.modmatrix = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🕸️ Modulation Matrix</h1><p>Routings de modulación: fuente → destino, profundidad y on/off.</p></div>
    <div class="ss-toolbar"><label class="hint">Pista</label><input id="mm-track" type="number" value="0" style="width:80px" /><button class="btn" id="mm-load">Cargar</button><span class="hint" id="mm-info"></span></div>
    <div id="mm-rows" class="mm-rows"><span class="hint">Pulsa «Cargar».</span></div>`;

  async function load() {
    const track_index = Number(panel.querySelector("#mm-track").value) || 0;
    const r = await exec("get_matrix", { track_index });
    const box = panel.querySelector("#mm-rows");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    panel.querySelector("#mm-info").textContent = `${r.data.totalRoutings} routings · ${r.data.freeSlots} libres`;
    for (const rt of r.data.routings) {
      const row = document.createElement("div");
      row.className = "mm-row" + (rt.enabled ? "" : " off");
      row.innerHTML = `
        <span class="mm-src">${rt.source}</span>
        <span class="mm-arrow">→</span>
        <span class="mm-tgt">${rt.target}</span>
        <div class="mm-depth"><div class="mm-depth-fill" style="width:${rt.depth}%; ${rt.bipolar ? 'background:var(--accent2)' : ''}"></div></div>
        <span class="mm-pct">${rt.depth}%</span>
        <button class="mm-en${rt.enabled ? ' on' : ''}">${rt.enabled ? 'on' : 'off'}</button>`;
      row.querySelector(".mm-en").onclick = async (e) => {
        const res = await exec("toggle_modulation", { track_index, routing_id: rt.id, enabled: !rt.enabled });
        rt.enabled = res.data?.enabled;
        e.target.textContent = rt.enabled ? "on" : "off";
        e.target.classList.toggle("on", rt.enabled);
        row.classList.toggle("off", !rt.enabled);
      };
      box.appendChild(row);
    }
  }
  panel.querySelector("#mm-load").onclick = load;
  load();
};
