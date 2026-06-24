// Rich panel: Session Health — score gauge + issue checklist with per-issue Fix buttons,
// from the real run_checks / list_issues / fix_issue tools. A report with actions, not a form.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.health = function (panel, helpers) {
  const exec = helpers.execute;
  const SEV = { error: "#e24b4a", warning: "#ffb347", info: "#6cc6ff" };

  panel.innerHTML = `
    <div class="panel-head"><h1>🩺 Session Health</h1><p>Run checks, see the score and fix issues. Each fix calls the real tool.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="h-run">Run checks</button>
      <span class="hint" id="h-info"></span>
    </div>
    <div style="display:flex;gap:18px;align-items:flex-start;margin-top:6px">
      <div id="h-gauge" style="flex:0 0 130px"></div>
      <div id="h-list" style="flex:1"></div>
    </div>`;

  function gauge(score) {
    const r = 52, c = 2 * Math.PI * r, off = c * (1 - score / 100);
    const col = score >= 85 ? "#5ad17a" : score >= 60 ? "#ffb347" : "#e24b4a";
    panel.querySelector("#h-gauge").innerHTML = `
      <svg viewBox="0 0 130 130" style="width:130px">
        <circle cx="65" cy="65" r="${r}" fill="none" stroke="#2a2a30" stroke-width="12" />
        <circle cx="65" cy="65" r="${r}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"
          stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 65 65)" />
        <text x="65" y="60" text-anchor="middle" fill="#e8e8ea" font-size="30" font-weight="600">${score}</text>
        <text x="65" y="82" text-anchor="middle" fill="#9a9aa2" font-size="12">health</text>
      </svg>`;
  }

  async function run() {
    const r = await exec("run_checks", {});
    if (!r.success) { panel.querySelector("#h-info").textContent = r.error; return; }
    gauge(r.data.score);
    const issues = r.data.issues || [];
    panel.querySelector("#h-info").textContent = `${issues.length} issues · score ${r.data.score}`;
    const box = panel.querySelector("#h-list");
    box.innerHTML = "";
    issues.forEach((iss, i) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid #2f2f36;border-radius:8px;margin-bottom:7px";
      row.innerHTML = `
        <span style="width:9px;height:9px;border-radius:50%;background:${SEV[iss.severity] || "#888"};flex:0 0 auto"></span>
        <span style="flex:1;color:#e8e8ea;font-size:13px">${iss.message}</span>
        <span class="hint" style="font-size:11px;text-transform:uppercase">${iss.severity}</span>
        <button class="btn ghost h-fix" style="padding:3px 10px">Fix</button>`;
      row.querySelector(".h-fix").onclick = async (e) => {
        const fr = await exec("fix_issue", { issue_id: i + 1 });
        if (fr.success) { e.target.textContent = "✓ Fixed"; e.target.disabled = true; row.style.opacity = "0.55"; }
      };
      box.appendChild(row);
    });
  }
  panel.querySelector("#h-run").onclick = run;
  run();
};
