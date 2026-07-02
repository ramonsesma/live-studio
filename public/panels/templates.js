// Rich panel: Project Templates — one-click genre starter kits + real project extraction/apply.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.templates = function (panel, helpers) {
  const exec = helpers.execute;
  const GENRES = [
    { id: "electronic", label: "Electronic", icon: "🎛️" },
    { id: "hiphop", label: "Hip-Hop", icon: "🎤" },
    { id: "band", label: "Band", icon: "🎸" },
    { id: "podcast", label: "Podcast", icon: "🎙️" },
  ];
  panel.innerHTML = `
    <div class="panel-head"><h1>📐 Project Templates</h1><p>One-click genre starter kits, or extract/apply your own real project structure.</p></div>
    <div class="hint" style="margin-bottom:6px">Built-in starter kits (creates real tracks + best-effort real device chains)</div>
    <div id="tp-genres" class="fx-grid"></div>
    <div class="ss-toolbar" style="margin-top:16px">
      <label class="hint">Save current project as</label>
      <input id="tp-name" type="text" placeholder="My Template" style="width:180px" />
      <button class="btn" id="tp-extract">Extract template</button>
      <span class="hint" id="tp-info"></span>
    </div>
    <div class="hint" style="margin:12px 0 6px">Saved templates</div>
    <div id="tp-saved"></div>`;

  panel.querySelector("#tp-genres").innerHTML = GENRES.map((g) => `
    <div class="fx-card">
      <h3>${g.icon} ${g.label}</h3>
      <p class="hint">Real tracks + native device chains for a ${g.label.toLowerCase()} session.</p>
      <button class="btn tp-apply-genre" data-genre="${g.id}">Apply</button>
    </div>`).join("");
  panel.querySelectorAll(".tp-apply-genre").forEach((b) => b.onclick = async () => {
    const r = await exec("apply_template", { genre: b.dataset.genre });
    panel.querySelector("#tp-info").textContent = r.success ? `Created ${r.data.tracksCreated} tracks (${r.data.templateName})` : r.error;
  });

  async function refreshSaved() {
    const r = await exec("list_templates", {});
    const box = panel.querySelector("#tp-saved");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    const saved = r.data.templates.filter((t) => !t.builtin);
    box.innerHTML = saved.length ? saved.map((t) => `
      <div style="display:flex;align-items:center;gap:10px;border:1px solid #2f2f36;border-radius:7px;padding:7px 10px;background:#13131a;margin-bottom:6px">
        <span style="flex:1;color:#e8e8ea;font-size:12px">${t.name} <span class="hint" style="font-size:10px">${t.trackCount} tracks</span></span>
        <button class="btn ghost tp-apply-saved" data-id="${t.id}" style="padding:2px 9px;font-size:11px">Apply</button>
      </div>`).join("") : `<span class="hint">No saved templates yet — extract one above.</span>`;
    box.querySelectorAll(".tp-apply-saved").forEach((b) => b.onclick = async () => {
      const r = await exec("apply_template", { template_id: b.dataset.id });
      panel.querySelector("#tp-info").textContent = r.success ? `Created ${r.data.tracksCreated} tracks (${r.data.templateName})` : r.error;
    });
  }
  panel.querySelector("#tp-extract").onclick = async () => {
    const name = panel.querySelector("#tp-name").value.trim() || "My Template";
    const r = await exec("extract_template", { name });
    panel.querySelector("#tp-info").textContent = r.success ? `Extracted "${name}" (${r.data.trackCount} tracks)` : r.error;
    if (r.success) { panel.querySelector("#tp-name").value = ""; refreshSaved(); }
  };
  refreshSaved();
};
