// Rich panel: Mix Coach — runs the real health scan, masking matrix and gain-staging plan
// together and shows one prioritized "what to do next" list, each with a one-click Apply that
// calls the exact same tool the copilot would call.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.mixcoach = function (panel, helpers) {
  const api = helpers.api;
  const analyze = (body) => api.post("/api/mixcoach", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>🩺 Mix Coach</h1><p>Combines the real Health, Resonance and Auto-Gain analyses into one prioritized list of concrete next steps.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="mc-run"><i class="ti ti-stethoscope" aria-hidden="true"></i> Analyze</button>
      <button class="btn ghost" id="mc-demo">Demo</button>
      <span class="hint" id="mc-info"></span>
    </div>
    <div id="mc-scores" style="display:flex;gap:16px;margin:10px 0;font-size:12px;color:#9a9aa2"></div>
    <div id="mc-steps" style="display:flex;flex-direction:column;gap:7px"></div>`;

  const CAT_COLOR = { health: "#e24b4a", masking: "#ffb347", "gain-staging": "#6cc6ff" };

  function renderScores(d) {
    panel.querySelector("#mc-scores").innerHTML = `
      <span>Health score: <b style="color:${d.healthScore >= 80 ? '#5ad17a' : d.healthScore >= 50 ? '#ffb347' : '#e24b4a'}">${d.healthScore ?? "—"}</b></span>
      <span>Masking collisions: <b>${d.maskingCollisions ?? "—"}</b></span>
      <span>Gain target: <b>${d.gainTargetDb != null ? d.gainTargetDb + " dBFS" : "—"}</b></span>`;
  }
  function renderSteps(steps) {
    const box = panel.querySelector("#mc-steps");
    if (!steps.length) { box.innerHTML = `<span class="hint">Nothing to flag — mix looks healthy.</span>`; return; }
    box.innerHTML = steps.map((s, i) => `
      <div style="border:1px solid #2f2f36;border-radius:8px;padding:8px 10px">
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:9.5px;border:1px solid ${CAT_COLOR[s.category] || '#9a9aa3'}44;color:${CAT_COLOR[s.category] || '#9a9aa3'};border-radius:4px;padding:1px 6px">${s.category}</span>
          <span style="flex:1;color:#e8e8ea;font-size:12px">${s.message}</span>
          ${s.action ? `<button class="btn ghost mc-apply" data-i="${i}" style="padding:2px 9px;font-size:11px">Apply</button>` : ""}
        </div>
      </div>`).join("");
    box.querySelectorAll(".mc-apply").forEach((b) => b.onclick = async () => {
      const step = steps[+b.dataset.i];
      const res = await api.post("/api/execute", { name: step.action.tool, args: step.action.args });
      b.textContent = res.success ? "✓ done" : "✗ failed"; b.disabled = true;
    });
  }
  async function run(body) {
    panel.querySelector("#mc-info").textContent = "Analyzing…";
    const r = await analyze(body);
    if (!r.success) { panel.querySelector("#mc-info").textContent = r.error; return; }
    panel.querySelector("#mc-info").textContent = `${r.data.nextSteps.length} step(s) suggested`;
    renderScores(r.data); renderSteps(r.data.nextSteps);
  }
  panel.querySelector("#mc-run").onclick = () => run({});
  panel.querySelector("#mc-demo").onclick = () => run({ demo: true });
  run({ demo: true });
};
