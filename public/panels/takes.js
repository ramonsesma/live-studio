// Rich panel: Takes & Comping — take lanes with rating.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.takes = function (panel, helpers) {
  const exec = helpers.execute;
  const RATING = { best: "var(--ok)", good: "var(--accent2)", okay: "var(--accent)", noisy: "var(--err)" };
  panel.innerHTML = `
    <div class="panel-head"><h1>🎙️ Takes & Comping</h1><p>Recorded takes with their rating. Pick the best sections and build the comp.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="tk-track" type="number" value="0" style="width:70px" />
      <button class="btn" id="tk-load">List takes</button>
      <button class="btn ghost" id="tk-best">Auto-select best</button>
      <button class="btn ghost" id="tk-comp">Comp from takes</button>
    </div>
    <div id="tk-lanes" class="tk-lanes"><span class="hint">Click "List takes".</span></div>
    <div class="result" id="tk-out" style="display:none"></div>`;

  const out = panel.querySelector("#tk-out");
  function show(r){ out.style.display="block"; out.className="result "+(r.success?"ok":"err"); out.textContent=JSON.stringify(r.data||r,null,2); }
  const ti = () => Number(panel.querySelector("#tk-track").value) || 0;

  async function load() {
    const r = await exec("list_takes", { track_index: ti() });
    const box = panel.querySelector("#tk-lanes");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    for (const t of r.data.takes) {
      const lane = document.createElement("div");
      lane.className = "tk-lane" + (t.selected ? " sel" : "");
      lane.innerHTML = `
        <span class="tk-dot" style="background:${RATING[t.rating] || 'var(--muted)'}"></span>
        <span class="tk-name">${t.name}</span>
        <div class="tk-clip" style="background:${RATING[t.rating] || 'var(--bg3)'}33; border-color:${RATING[t.rating] || 'var(--line)'}"></div>
        <span class="hint">${t.rating}${t.selected ? " · active" : ""}</span>`;
      box.appendChild(lane);
    }
  }
  panel.querySelector("#tk-load").onclick = load;
  panel.querySelector("#tk-best").onclick = async () => show(await exec("select_best_takes", { track_index: ti(), algorithm: "balanced" }));
  panel.querySelector("#tk-comp").onclick = async () => show(await exec("comp_from_takes", { track_index: ti() }));
  load();
};
