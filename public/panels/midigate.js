// Rich panel: Trance Gate — on/off step grid; "Apply" sends the binary pattern to the
// real set_gate_pattern tool. A gate pattern is a grid, not a set of form fields.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.midigate = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>⛓️ Trance Gate</h1><p>Draw a gate pattern; "Apply" writes it through the real tool.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Steps</label>
      <select id="g-steps"><option>8</option><option selected>16</option><option>32</option></select>
      <label class="hint">Rate</label>
      <select id="g-rate"><option>1/8</option><option selected>1/16</option><option>1/32</option></select>
      <label class="hint">Density</label><input id="g-dens" type="range" min="0" max="100" value="50" />
      <button class="btn ghost" id="g-rnd">Randomize</button>
      <button class="btn ghost" id="g-clr">Clear</button>
      <button class="btn" id="g-apply">Apply</button>
      <span class="hint" id="g-info"></span>
    </div>
    <div id="g-grid" class="ss-grid"></div>`;

  let steps = [];
  function resize() {
    const n = Number(panel.querySelector("#g-steps").value);
    steps = Array.from({ length: n }, (_, i) => steps[i] || false);
    steps.length = n;
    render();
  }
  function render() {
    const grid = panel.querySelector("#g-grid");
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `repeat(${Math.min(steps.length, 16)}, 1fr)`;
    steps.forEach((on, i) => {
      const cell = document.createElement("div");
      cell.className = "ss-cell" + (on ? " on" : "");
      cell.title = `step ${i + 1}`;
      if (i % 4 === 0) cell.style.boxShadow = "inset 2px 0 0 #ffb34788";
      cell.onclick = () => { steps[i] = !steps[i]; cell.classList.toggle("on", steps[i]); };
      grid.appendChild(cell);
    });
  }
  function randomize() {
    const d = Number(panel.querySelector("#g-dens").value) / 100;
    steps = steps.map(() => Math.random() < d);
    render();
  }
  async function apply() {
    const pattern = steps.map((s) => (s ? "1" : "0")).join("");
    const rate = panel.querySelector("#g-rate").value;
    if (!pattern.includes("1")) { panel.querySelector("#g-info").textContent = "Pattern is empty"; return; }
    const r = await exec("set_gate_pattern", { pattern, rate });
    panel.querySelector("#g-info").textContent = r.success
      ? `applied ${r.data.resolvedSteps}/${r.data.steps} gates · ${rate}`
      : r.error;
  }
  panel.querySelector("#g-steps").onchange = resize;
  panel.querySelector("#g-rnd").onclick = randomize;
  panel.querySelector("#g-clr").onclick = () => { steps = steps.map(() => false); render(); };
  panel.querySelector("#g-apply").onclick = apply;
  resize();
  randomize();
};
