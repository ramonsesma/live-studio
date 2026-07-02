// Rich panel: Project Notes — persisted sticky notes with categories, tags, pin, search, export.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.notes = function (panel, helpers) {
  const exec = helpers.execute;
  const CATS = ["general","mix","arrangement","production","todo","lyric"];
  const CAT_COLOR = { general:"#9a9aa3", mix:"#6cc6ff", arrangement:"#82c98a", production:"#ffb347", todo:"#e24b4a", lyric:"#b58ce0" };
  panel.innerHTML = `
    <div class="panel-head"><h1>📝 Project Notes</h1><p>Persisted notes with categories, tags and search — survive across sessions.</p></div>
    <div class="ss-toolbar">
      <select id="nt-cat">${CATS.map((c) => `<option>${c}</option>`).join("")}</select>
      <input id="nt-text" type="text" placeholder="Note text…" style="flex:1;min-width:220px" />
      <input id="nt-tags" type="text" placeholder="tags, comma, separated" style="width:160px" />
      <button class="btn" id="nt-add">Add note</button>
    </div>
    <div class="ss-toolbar" style="margin-top:8px">
      <input id="nt-search" type="text" placeholder="Search…" style="width:180px" />
      <select id="nt-filter"><option value="">All categories</option>${CATS.map((c) => `<option>${c}</option>`).join("")}</select>
      <button class="btn ghost" id="nt-go">Search</button>
      <button class="btn ghost" id="nt-export">Export (markdown)</button>
      <span class="hint" id="nt-info"></span>
    </div>
    <div id="nt-list" style="margin-top:10px;display:flex;flex-direction:column;gap:6px"></div>
    <pre id="nt-exportout" class="result" style="display:none;white-space:pre-wrap"></pre>`;

  async function refresh() {
    const category = panel.querySelector("#nt-filter").value;
    const query = panel.querySelector("#nt-search").value.trim();
    const r = await exec("get_notes", { category: category || undefined, query: query || undefined });
    const box = panel.querySelector("#nt-list");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    panel.querySelector("#nt-info").textContent = `${r.data.count}/${r.data.total} notes`;
    box.innerHTML = r.data.notes.length ? r.data.notes.map((n) => `
      <div style="border:1px solid ${n.pinned ? "#ffb347" : "#2f2f36"};border-radius:8px;padding:8px 10px;background:#13131a">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
          <span style="font-size:9.5px;border:1px solid ${CAT_COLOR[n.category]}44;color:${CAT_COLOR[n.category]};border-radius:4px;padding:1px 6px">${n.category}</span>
          <span class="hint" style="font-size:10px">${new Date(n.timestamp).toLocaleString()}</span>
          <span style="flex:1"></span>
          <button class="btn ghost nt-pin" data-id="${n.id}" style="padding:1px 7px;font-size:11px">${n.pinned ? "★" : "☆"}</button>
          <button class="btn ghost nt-del" data-id="${n.id}" style="padding:1px 7px;font-size:11px">✕</button>
        </div>
        <div style="color:#e8e8ea;font-size:13px">${n.text}</div>
        ${n.tags?.length ? `<div class="hint" style="font-size:10px;margin-top:4px">${n.tags.map((t) => `#${t}`).join(" ")}</div>` : ""}
      </div>`).join("") : `<span class="hint">No notes yet.</span>`;
    box.querySelectorAll(".nt-pin").forEach((b) => b.onclick = async () => { await exec("update_note", { note_id: b.dataset.id, pinned: b.textContent.trim() === "☆" }); refresh(); });
    box.querySelectorAll(".nt-del").forEach((b) => b.onclick = async () => { await exec("delete_note", { note_id: b.dataset.id }); refresh(); });
  }
  panel.querySelector("#nt-add").onclick = async () => {
    const text = panel.querySelector("#nt-text").value.trim();
    if (!text) return;
    await exec("add_note", { category: panel.querySelector("#nt-cat").value, text, tags: panel.querySelector("#nt-tags").value.trim() });
    panel.querySelector("#nt-text").value = ""; panel.querySelector("#nt-tags").value = ""; refresh();
  };
  panel.querySelector("#nt-go").onclick = refresh;
  panel.querySelector("#nt-export").onclick = async () => {
    const r = await exec("export_notes", { format: "markdown" });
    const out = panel.querySelector("#nt-exportout");
    if (r.success) { out.style.display = "block"; out.textContent = r.data.content; }
  };
  refresh();
};
