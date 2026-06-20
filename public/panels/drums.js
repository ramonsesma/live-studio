// Rich panel: Drums & Patterns — genre cards with BPM and direct generation.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.drums = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🥁 Drums & Patterns</h1><p>Generate a drum pattern by genre. Tune complexity and swing.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Complexity</label><input id="dr-cx" type="range" min="1" max="5" value="3" />
      <span class="hint" id="dr-cxv">3</span>
      <label class="hint">Swing</label><input id="dr-sw" type="range" min="0" max="1" step="0.05" value="0" />
      <span class="hint" id="dr-swv">0</span>
    </div>
    <div id="dr-grid" class="fx-grid"><span class="hint">Loading genres…</span></div>
    <div class="result" id="dr-out" style="display:none"></div>`;

  const out = panel.querySelector("#dr-out");
  const cx = panel.querySelector("#dr-cx"), sw = panel.querySelector("#dr-sw");
  cx.oninput = () => panel.querySelector("#dr-cxv").textContent = cx.value;
  sw.oninput = () => panel.querySelector("#dr-swv").textContent = sw.value;
  function show(r){ out.style.display="block"; out.className="result "+(r.success?"ok":"err"); out.textContent=JSON.stringify(r.data||r,null,2); }

  (async () => {
    const r = await exec("get_genres", {});
    const box = panel.querySelector("#dr-grid");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    for (const g of r.data.genres) {
      const card = document.createElement("div");
      card.className = "fx-card";
      card.innerHTML = `<h3>${g.name}</h3><p class="hint">${g.bpm} BPM</p><button class="btn">Generate</button>`;
      card.querySelector("button").onclick = async () => {
        show(await exec("generate_pattern", { genre: g.id, complexity: Number(cx.value), swing: Number(sw.value) }));
      };
      box.appendChild(card);
    }
  })();
};
