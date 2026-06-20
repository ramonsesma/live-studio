// Rich panel: Genre Classifier — genre confidence bars.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.genre = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🏷️ Genre Classifier</h1><p>Genre scores for a track. The tallest bar is the primary genre.</p></div>
    <div class="ss-toolbar"><label class="hint">Track</label><input id="gn-track" type="number" value="0" style="width:70px" /><button class="btn" id="gn-go">Classify</button><span class="hint" id="gn-info"></span></div>
    <div id="gn-bars" class="gn-bars"><span class="hint">Click "Classify".</span></div>`;

  async function go() {
    const r = await exec("classify_track", { track_index: Number(panel.querySelector("#gn-track").value)||0 });
    const box = panel.querySelector("#gn-bars");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    panel.querySelector("#gn-info").textContent = `primary: ${r.data.primaryGenre} (${Math.round(r.data.confidence)}%)`;
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
