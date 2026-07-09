// Rich panel: Linked Clips — a group manager. Typing clip refs (t0_c1,t2_c0) and group ids by
// hand in the autoform is unpleasant for a stateful multi-clip workflow, so this panel lists
// existing groups and lets sync/unlink happen with one click.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.linkedclips = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>🔗 Linked Clips</h1><p>Master/slave clip groups: link Session clips, then propagate one member's real notes to the rest in one call.</p></div>
    <div class="ss-toolbar">
      <input id="lc-clips" type="text" placeholder="t0_c1,t2_c0,t3_c1" style="flex:1;min-width:200px" />
      <input id="lc-name" type="text" placeholder="Group name (optional)" style="width:160px" />
      <button class="btn" id="lc-create">Link</button>
      <span class="hint" id="lc-info">refs look like t&lt;track&gt;_c&lt;clip slot&gt;</span>
    </div>
    <div id="lc-list" style="margin-top:14px;display:flex;flex-direction:column;gap:8px"></div>`;

  async function refresh() {
    const r = await exec("list_groups", {});
    const list = panel.querySelector("#lc-list");
    if (!r.success || !r.data.groups.length) { list.innerHTML = `<div class="hint">No groups yet — link some clips above.</div>`; return; }
    list.innerHTML = r.data.groups.map((g) => `
      <div class="dash-card" data-id="${g.id}" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px"><b>${g.name}</b><div class="hint" style="font-size:11px">${g.members.join(" · ")}</div></div>
        <select class="lc-src" style="width:110px">${g.members.map((m) => `<option value="${m}">${m}</option>`).join("")}</select>
        <button class="btn lc-sync" style="padding:5px 10px">Sync from ⟶</button>
        <button class="btn ghost lc-del" style="padding:5px 10px">Unlink</button>
        <span class="hint lc-status" style="width:100%"></span>
      </div>`).join("");
    list.querySelectorAll(".dash-card").forEach((card) => {
      const id = card.dataset.id;
      card.querySelector(".lc-sync").onclick = async () => {
        const status = card.querySelector(".lc-status");
        status.textContent = "syncing…";
        const r2 = await exec("sync_group", { group_id: id, source: card.querySelector(".lc-src").value });
        status.textContent = r2.success ? `✓ synced ${r2.data.syncedCount} member(s) from ${r2.data.source}` : r2.error;
      };
      card.querySelector(".lc-del").onclick = async () => {
        await exec("unlink_group", { group_id: id });
        refresh();
      };
    });
  }

  panel.querySelector("#lc-create").onclick = async () => {
    const clips = panel.querySelector("#lc-clips").value.trim();
    if (!clips) { panel.querySelector("#lc-info").textContent = "give at least two clip refs"; return; }
    const r = await exec("link_clips", { clips, name: panel.querySelector("#lc-name").value || undefined });
    panel.querySelector("#lc-info").textContent = r.success ? `✓ linked "${r.data.name}"` : r.error;
    if (r.success) { panel.querySelector("#lc-clips").value = ""; panel.querySelector("#lc-name").value = ""; refresh(); }
  };

  refresh();
};
