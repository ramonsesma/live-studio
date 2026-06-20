// Panel rico: Clasificador de Género — barras de confianza por género.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.genre = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🏷️ Clasificador de Género</h1><p>Puntuación por género de una pista. La barra más alta es el género principal.</p></div>
    <div class="ss-toolbar"><label class="hint">Pista</label><input id="gn-track" type="number" value="0" style="width:70px" /><button class="btn" id="gn-go">Clasificar</button><span class="hint" id="gn-info"></span></div>
    <div id="gn-bars" class="gn-bars"><span class="hint">Pulsa «Clasificar».</span></div>`;

  async function go() {
    const r = await exec("classify_track", { track_index: Number(panel.querySelector("#gn-track").value)||0 });
    const box = panel.querySelector("#gn-bars");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    panel.querySelector("#gn-info").textContent = `principal: ${r.data.primaryGenre} (${Math.round(r.data.confidence)}%)`;
    const entries = Object.entries(r.data.allScores).sort((a, b) => b[1] - a[1]);
    for (const [g, score] of entries) {
      const row = document.createElement("div");
      row.className = "gn-row" + (g === r.data.primaryGenre ? " top" : "");
      row.innerHTML = `<span class="gn-label">${g}</span><div class="gn-track"><div class="gn-fill" style="width:${Math.round(score)}%"></div></div><span class="gn-pct">${Math.round(score)}%</span>`;
      box.appendChild(row);
    }
  }
  panel.querySelector("#gn-go").onclick = go;
  go();
};
