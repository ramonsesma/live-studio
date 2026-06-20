// Panel rico para el módulo "organizer" (session-organizer, 7 tools de organización).
// Se registra en window.LiveStudioPanels; shell.js lo invoca en vez del autoform.
window.LiveStudioPanels = window.LiveStudioPanels || {};

window.LiveStudioPanels.organizer = function (panel, helpers) {
  // helpers.execute(toolName, args) → ya namespacea con "organizer__"
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head">
      <h1>🧩 Organizador de Sesión</h1>
      <p>Dashboard de organización: score, análisis estructural, naming y plantillas.</p>
    </div>

    <div class="org-grid">
      <div class="org-card org-score">
        <div class="org-gauge"><div class="org-gauge-val" id="org-score">—</div><div class="org-gauge-lbl">/ 10 score</div></div>
        <div class="org-eff"><span class="hint">Eficiencia</span><div class="org-bar"><div class="org-bar-fill" id="org-eff-fill" style="width:0%"></div></div><span id="org-eff-val" class="hint">—</span></div>
        <button class="btn" id="org-refresh">↻ Analizar sesión</button>
      </div>

      <div class="org-card">
        <h3>📋 Recomendaciones</h3>
        <ul class="org-list" id="org-recs"><li class="hint">Pulsa «Analizar sesión».</li></ul>
        <h3 style="margin-top:14px">⚠️ Cuellos de botella</h3>
        <ul class="org-list" id="org-bottlenecks"><li class="hint">—</li></ul>
      </div>
    </div>

    <div class="org-card">
      <h3>🎚️ Categorías de pistas</h3>
      <div class="org-chips" id="org-cats"><span class="hint">—</span></div>
      <h3 style="margin-top:14px">🎬 Grupos de escenas</h3>
      <div class="org-chips" id="org-scenes"><span class="hint">—</span></div>
    </div>

    <div class="org-actions">
      <div class="org-card">
        <h3>⚡ Acciones rápidas</h3>
        <button class="btn ghost org-act" data-tool="auto_organize_tracks">Auto-organizar pistas</button>
        <div class="org-row">
          <input id="org-track-pat" placeholder="{index}_{type}_{category}" />
          <button class="btn ghost org-act" data-tool="standardize_naming" data-arg="track_pattern:org-track-pat">Estandarizar naming</button>
        </div>
        <div class="org-row">
          <select id="org-group-strat"><option value="tempo">por tempo</option><option value="length">por duración</option><option value="name_pattern">por nombre</option></select>
          <button class="btn ghost org-act" data-tool="group_scenes" data-arg="grouping_strategy:org-group-strat">Agrupar escenas</button>
        </div>
      </div>

      <div class="org-card">
        <h3>🎼 Plantilla por género</h3>
        <div class="org-row">
          <select id="org-genre"><option>pop</option><option>rock</option><option>jazz</option><option>electronic</option><option>hiphop</option></select>
          <button class="btn" id="org-tpl">Generar plantilla</button>
        </div>
        <h3 style="margin-top:14px">📤 Exportar</h3>
        <div class="org-row">
          <select id="org-fmt"><option>json</option><option>csv</option><option>txt</option></select>
          <button class="btn ghost" id="org-export">Exportar info</button>
        </div>
      </div>
    </div>

    <div class="result" id="org-out" style="display:none"></div>
  `;

  const out = panel.querySelector("#org-out");
  function show(result) {
    out.style.display = "block";
    out.className = "result " + (result && result.success ? "ok" : "err");
    out.textContent = JSON.stringify(result, null, 2);
  }

  async function refresh() {
    const btn = panel.querySelector("#org-refresh");
    btn.disabled = true; btn.textContent = "Analizando…";
    try {
      const sum = await exec("get_session_summary", {});
      const ana = await exec("analyze_session_structure", {});
      if (sum.success) {
        const d = sum.data;
        panel.querySelector("#org-score").textContent = (Math.round(d.organizationScore * 10) / 10);
        renderList("#org-recs", d.recommendations, "Sin recomendaciones ✓");
        renderChips("#org-cats", Object.entries(d.trackCategories || {}).filter(([, v]) => v.length).map(([k, v]) => `${k} · ${v.length}`));
        renderChips("#org-scenes", Object.entries(d.sceneGroups || {}).filter(([, v]) => v.length).map(([k, v]) => `${k} · ${v.length}`));
      }
      if (ana.success) {
        const eff = ana.data.efficiencyScore || 0;
        panel.querySelector("#org-eff-fill").style.width = Math.round(eff) + "%";
        panel.querySelector("#org-eff-val").textContent = Math.round(eff) + "/100";
        renderList("#org-bottlenecks", ana.data.bottlenecks, "Ninguno ✓");
      }
    } finally { btn.disabled = false; btn.textContent = "↻ Analizar sesión"; }
  }

  function renderList(sel, items, empty) {
    const ul = panel.querySelector(sel);
    ul.innerHTML = "";
    if (!items || !items.length) { ul.innerHTML = `<li class="hint">${empty}</li>`; return; }
    for (const it of items) { const li = document.createElement("li"); li.textContent = it; ul.appendChild(li); }
  }
  function renderChips(sel, items) {
    const box = panel.querySelector(sel);
    box.innerHTML = "";
    if (!items || !items.length) { box.innerHTML = `<span class="hint">—</span>`; return; }
    for (const it of items) { const s = document.createElement("span"); s.className = "org-chip"; s.textContent = it; box.appendChild(s); }
  }

  panel.querySelector("#org-refresh").onclick = refresh;

  panel.querySelectorAll(".org-act").forEach((b) => {
    b.onclick = async () => {
      const tool = b.dataset.tool;
      const args = {};
      if (b.dataset.arg) { const [key, inputId] = b.dataset.arg.split(":"); const v = panel.querySelector("#" + inputId).value; if (v) args[key] = v; }
      b.disabled = true;
      try { show(await exec(tool, args)); if (tool !== "standardize_naming") refresh(); }
      finally { b.disabled = false; }
    };
  });

  panel.querySelector("#org-tpl").onclick = async () => {
    show(await exec("create_session_template", { genre: panel.querySelector("#org-genre").value }));
  };
  panel.querySelector("#org-export").onclick = async () => {
    show(await exec("export_session_info", { format: panel.querySelector("#org-fmt").value }));
  };

  refresh();
};
