// Rich panel: DJ & Mezcla Armónica — rueda Camelot interactive.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.harmonic = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎶 DJ & Harmonic Mixing</h1><p>Camelot wheel: detect a track's key and highlight its compatibles.</p></div>
    <div class="ss-toolbar"><label class="hint">Track</label><input id="hm-track" type="number" value="0" style="width:80px" /><button class="btn" id="hm-detect">Detect key</button><span class="hint" id="hm-info"></span></div>
    <div class="hm-layout">
      <div id="hm-wheel" class="hm-wheel"></div>
      <div class="hm-side"><h3>Tracks compatibles</h3><div id="hm-compat" class="org-list-box"><span class="hint">—</span></div></div>
    </div>`;

  // 12 posiciones de la rueda (orden Camelot 1..12 en círculo)
  const wheel = panel.querySelector("#hm-wheel");
  const cells = {};
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const num = i + 1;
    ["A", "B"].forEach((ab, ring) => {
      const radius = ring === 0 ? 34 : 62; // A interior, B exterior (%)
      const x = 50 + Math.cos(ang) * radius;
      const y = 50 + Math.sin(ang) * radius;
      const code = `${num}${ab}`;
      const el = document.createElement("div");
      el.className = "hm-cell " + (ab === "A" ? "hm-a" : "hm-b");
      el.style.left = x + "%"; el.style.top = y + "%";
      el.textContent = code;
      cells[code] = el;
      wheel.appendChild(el);
    });
  }

  panel.querySelector("#hm-detect").onclick = async () => {
    Object.values(cells).forEach(c => { c.classList.remove("active", "compat"); });
    const track_index = Number(panel.querySelector("#hm-track").value) || 0;
    const cam = await exec("get_camelot", { track_index });
    if (cam.success) {
      panel.querySelector("#hm-info").textContent = `${cam.data.detectedKey} · ${cam.data.camelotCode} · conf ${cam.data.confidence}`;
      cells[cam.data.camelotCode]?.classList.add("active");
    }
    const comp = await exec("find_compatible", { track_index });
    const box = panel.querySelector("#hm-compat");
    box.innerHTML = "";
    if (comp.success) {
      for (const t of comp.data.compatibleTracks) {
        cells[t.camelotCode]?.classList.add("compat");
        const li = document.createElement("div");
        li.className = "hm-compat-row" + (t.compatible ? " ok" : "");
        li.innerHTML = `<span>${t.name}</span><span class="hint">${t.camelotCode} · energy ${t.energyChange > 0 ? '+' : ''}${t.energyChange.toFixed(2)}</span>`;
        box.appendChild(li);
      }
    }
  };
};
