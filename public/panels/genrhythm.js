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
      <label class="hint">Fill every</label><select id="gr-fill"><option value="0" selected>off</option><option value="2">2</option><option value="4">4</option></select>
      <button class="btn" id="gr-gen">Generate</button>
      <button class="btn ghost" id="gr-evolve">Evolve ↻</button>
      <span class="hint" id="gr-info">Click Generate (writes a new clip).</span>
    </div>
    <div id="gr-grid"></div>
    <div class="ss-toolbar" style="margin-top:10px">
      <label class="hint">Fill</label><select id="gr-fstyle"><option value="mixed" selected>mixed</option><option value="snare">snare</option><option value="tom">tom</option></select>
      <label class="hint">beats</label><input id="gr-fbeats" type="number" value="1" step="0.5" style="width:48px" />
      <button class="btn ghost" id="gr-addfill"><i class="ti ti-flame" aria-hidden="true"></i> Add fill</button>
      <button class="btn ghost" id="gr-reshuf"><i class="ti ti-dice" aria-hidden="true"></i> Reshuffle</button>
      <button class="btn ghost" id="gr-undo"><i class="ti ti-arrow-back-up" aria-hidden="true"></i> Undo</button>
      <span class="hint" id="gr-binfo"></span>
    </div>`;

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

  let lastTrack = null, lastClip = 0;

  function demo() {
    const mk = (probs) => ({ steps: probs.map((p) => ({ on: p > 0, prob: p })) });
    const lanes = [
      Object.assign({ name: "Kick", pitch: 36 }, mk([1, 0, 0, 0, 0.6, 0, 0, 0, 1, 0, 0, 0.4, 0, 0, 0, 0])),
      Object.assign({ name: "Snare", pitch: 38 }, mk([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.4, 0, 1, 0, 0, 0])),
      Object.assign({ name: "Hat", pitch: 42 }, mk([0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.6])),
    ];
    render({ noteCount: 22, bars: 1, density: 55, evolve: false, lanes });
    panel.querySelector("#gr-info").textContent = "Demo (offline) — brightness = probability";
  }

  async function gen(evolveOverride) {
    const args = {
      bars: Number(panel.querySelector("#gr-bars").value),
      density: Number(panel.querySelector("#gr-dens").value),
      humanize: Number(panel.querySelector("#gr-hum").value),
      evolve: evolveOverride != null ? evolveOverride : panel.querySelector("#gr-evo").checked,
      fill_every: Number(panel.querySelector("#gr-fill").value),
    };
    const r = await exec("generate", args);
    if (r.success) { render(r.data); lastTrack = r.data.trackIndex; lastClip = 0; panel.querySelector("#gr-binfo").textContent = r.fills ? "" : ""; }
    else demo();
  }
  async function clipOp(tool, extra) {
    if (lastTrack == null) { panel.querySelector("#gr-binfo").textContent = "Generate a pattern first."; return; }
    const r = await exec(tool, Object.assign({ track_index: lastTrack, clip_index: lastClip }, extra || {}));
    panel.querySelector("#gr-binfo").textContent = r.success
      ? (r.data.reshuffled ? `Reshuffled · ${r.data.noteCount} notes · undo depth ${r.data.undoDepth}`
        : r.data.restored ? `Undone · ${r.data.noteCount} notes left`
        : `Fill added · ${r.data.fillNotes} hits`)
      : (r.error || "Failed");
  }
  panel.querySelector("#gr-dens").oninput = (e) => (panel.querySelector("#gr-densv").textContent = e.target.value);
  panel.querySelector("#gr-gen").onclick = () => gen();
  panel.querySelector("#gr-evolve").onclick = () => gen(true);
  panel.querySelector("#gr-addfill").onclick = () => clipOp("add_fill", { style: panel.querySelector("#gr-fstyle").value, beats: Number(panel.querySelector("#gr-fbeats").value) });
  panel.querySelector("#gr-reshuf").onclick = () => clipOp("reshuffle", { density: Number(panel.querySelector("#gr-dens").value), humanize: Number(panel.querySelector("#gr-hum").value), fill_every: Number(panel.querySelector("#gr-fill").value) });
  panel.querySelector("#gr-undo").onclick = () => clipOp("undo");
  demo();
};
