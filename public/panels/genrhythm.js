// Rich panel: Generative Rhythm Generator — grid where each cell's opacity is its native
// note probability. Generate writes a real clip; Live re-rolls the notes every loop.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.genrhythm = function (panel, helpers) {
  const exec = helpers.execute;
  const LANE_COL = { Kick: "#e8a13a", Snare: "#e85d8a", Hat: "#6cc6ff" };

  panel.innerHTML = `
    <div class="panel-head"><h1>🎲 Generative Rhythm</h1><p>Probabilistic patterns using the SDK's native note <code>probability</code> — every loop plays differently.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Bars</label><select id="gr-bars"><option>1</option><option selected>2</option><option>4</option></select>
      <label class="hint">Density</label><input id="gr-dens" type="range" min="5" max="95" value="55" /><span class="hint" id="gr-densv">55</span>
      <label class="hint">Humanize</label><input id="gr-hum" type="range" min="0" max="40" value="14" />
      <label class="hint"><input id="gr-evo" type="checkbox" /> evolve</label>
      <button class="btn" id="gr-gen">Generate</button>
      <button class="btn ghost" id="gr-evolve">Evolve ↻</button>
      <span class="hint" id="gr-info">Click Generate (writes a new clip).</span>
    </div>
    <div id="gr-grid"></div>`;

  function render(d) {
    panel.querySelector("#gr-info").textContent = `${d.noteCount} notes · ${d.bars} bars · density ${d.density}%${d.evolve ? " · evolving" : ""}`;
    const steps = d.lanes[0].steps.length;
    let html = "";
    d.lanes.forEach((lane) => {
      const col = LANE_COL[lane.name] || "#9a9aa2";
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:54px;font-size:12px;color:#cfcfd4;text-align:right">${lane.name}</span>
        <div style="flex:1;display:grid;grid-template-columns:repeat(${steps},1fr);gap:2px">`;
      lane.steps.forEach((s, i) => {
        const beat4 = i % 4 === 0;
        html += `<div title="step ${i + 1}${s.on ? " · p=" + s.prob : ""}" style="aspect-ratio:1;border-radius:2px;background:${s.on ? col : "#202026"};opacity:${s.on ? (0.25 + s.prob * 0.75).toFixed(2) : 1};box-shadow:${beat4 ? "inset 1px 0 0 #ffffff22" : "none"}"></div>`;
      });
      html += `</div></div>`;
    });
    html += `<div class="hint" style="font-size:11px;margin-top:4px">cell brightness = note probability · Live re-rolls them on every loop</div>`;
    panel.querySelector("#gr-grid").innerHTML = html;
  }

  async function gen(evolveOverride) {
    const args = {
      bars: Number(panel.querySelector("#gr-bars").value),
      density: Number(panel.querySelector("#gr-dens").value),
      humanize: Number(panel.querySelector("#gr-hum").value),
      evolve: evolveOverride != null ? evolveOverride : panel.querySelector("#gr-evo").checked,
    };
    const r = await exec("generate", args);
    if (r.success) render(r.data);
    else panel.querySelector("#gr-info").textContent = r.error;
  }
  panel.querySelector("#gr-dens").oninput = (e) => (panel.querySelector("#gr-densv").textContent = e.target.value);
  panel.querySelector("#gr-gen").onclick = () => gen();
  panel.querySelector("#gr-evolve").onclick = () => gen(true);
};
