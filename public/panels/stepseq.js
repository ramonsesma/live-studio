// Panel rico: Step Sequencer — rejilla de pasos generada por el tool real.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.stepseq = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🔢 Step Sequencer</h1><p>Genera un patrón y edita los pasos. Cada celda llama al tool real.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Pasos</label>
      <select id="ss-steps"><option>8</option><option selected>16</option><option>32</option></select>
      <button class="btn" id="ss-gen">Generar patrón</button>
      <span class="hint" id="ss-info"></span>
    </div>
    <div id="ss-grid" class="ss-grid"><span class="hint">Pulsa «Generar patrón».</span></div>`;

  let trackIndex = 0;
  async function gen() {
    const steps = Number(panel.querySelector("#ss-steps").value);
    const r = await exec("set_pattern", { track_index: 0, steps });
    if (!r.success) { panel.querySelector("#ss-grid").innerHTML = `<span class="hint">${r.error}</span>`; return; }
    trackIndex = r.data.trackIndex;
    panel.querySelector("#ss-info").textContent = `${r.data.activeSteps}/${r.data.totalSteps} activos · ${r.data.resolution}`;
    render(r.data.steps);
  }
  function render(steps) {
    const grid = panel.querySelector("#ss-grid");
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `repeat(${Math.min(steps.length,16)}, 1fr)`;
    steps.forEach((s) => {
      const cell = document.createElement("div");
      cell.className = "ss-cell" + (s.active ? " on" : "");
      cell.title = `paso ${s.step+1} · vel ${s.velocity}`;
      if (s.active) cell.style.opacity = (0.4 + (s.velocity/127)*0.6).toFixed(2);
      cell.onclick = async () => {
        const r = await exec("toggle_step", { track_index: trackIndex, step: s.step });
        s.active = r.data?.nowActive;
        cell.classList.toggle("on", s.active);
        cell.style.opacity = s.active ? "1" : "";
      };
      grid.appendChild(cell);
    });
  }
  panel.querySelector("#ss-gen").onclick = gen;
  gen();
};
