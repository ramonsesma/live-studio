// Rich panel: Setlist Manager — real persisted setlists with reorderable songs.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.setlist = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎫 Setlist Manager</h1><p>Real persisted setlists for live performance.</p></div>
    <div class="ss-toolbar">
      <input id="sl-name" type="text" placeholder="Setlist name" style="width:160px" />
      <input id="sl-tempo" type="number" placeholder="Tempo" style="width:80px" />
      <button class="btn" id="sl-create">Create setlist</button>
      <span class="hint" id="sl-info"></span>
    </div>
    <div id="sl-list" style="margin-top:10px;display:flex;flex-direction:column;gap:10px"></div>`;

  async function refresh() {
    const r = await exec("list_setlists", {});
    const box = panel.querySelector("#sl-list");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    if (!r.data.setlists.length) { box.innerHTML = `<span class="hint">No setlists yet.</span>`; return; }
    box.innerHTML = r.data.setlists.map((s) => `
      <div class="fx-card" data-id="${s.id}">
        <h3>${s.name} <span class="hint" style="font-size:11px">${s.tempo} BPM · ${s.songCount} songs</span></h3>
        <div class="sl-songs" style="margin:6px 0;display:flex;flex-direction:column;gap:4px">
          ${s.songs.map((song, i) => `
            <div style="display:flex;align-items:center;gap:8px;border:1px solid #2f2f36;border-radius:6px;padding:5px 8px;background:#13131a">
              <span class="hint" style="width:18px">${i + 1}</span>
              <span style="flex:1;color:#e8e8ea;font-size:12px">${song.name} <span class="hint" style="font-size:10px">${song.tempo} BPM · ${song.key}</span></span>
              <button class="btn ghost sl-up" data-id="${s.id}" data-i="${i}" style="padding:1px 7px" ${i === 0 ? "disabled" : ""}>↑</button>
              <button class="btn ghost sl-down" data-id="${s.id}" data-i="${i}" style="padding:1px 7px" ${i === s.songs.length - 1 ? "disabled" : ""}>↓</button>
            </div>`).join("")}
        </div>
        <div class="ss-toolbar">
          <input class="sl-songname" placeholder="Song name" style="width:120px" />
          <input class="sl-songtempo" type="number" placeholder="BPM" style="width:70px" />
          <button class="btn ghost sl-addsong" data-id="${s.id}">Add song</button>
          <button class="btn ghost sl-del" data-id="${s.id}" style="margin-left:auto">Delete setlist</button>
        </div>
      </div>`).join("");
    box.querySelectorAll(".sl-addsong").forEach((b) => b.onclick = async () => {
      const card = b.closest(".fx-card");
      const song_name = card.querySelector(".sl-songname").value.trim();
      const tempo = Number(card.querySelector(".sl-songtempo").value) || undefined;
      if (!song_name) return;
      await exec("add_song", { setlist_id: b.dataset.id, song_name, tempo });
      refresh();
    });
    box.querySelectorAll(".sl-up").forEach((b) => b.onclick = async () => { await exec("reorder_setlist", { setlist_id: b.dataset.id, song_index: +b.dataset.i, new_position: +b.dataset.i - 1 }); refresh(); });
    box.querySelectorAll(".sl-down").forEach((b) => b.onclick = async () => { await exec("reorder_setlist", { setlist_id: b.dataset.id, song_index: +b.dataset.i, new_position: +b.dataset.i + 1 }); refresh(); });
    box.querySelectorAll(".sl-del").forEach((b) => b.onclick = async () => { await exec("delete_setlist", { setlist_id: b.dataset.id }); refresh(); });
  }
  panel.querySelector("#sl-create").onclick = async () => {
    const name = panel.querySelector("#sl-name").value.trim();
    if (!name) return;
    const tempo = Number(panel.querySelector("#sl-tempo").value) || undefined;
    const r = await exec("create_setlist", { name, tempo });
    panel.querySelector("#sl-info").textContent = r.success ? `Created "${name}"` : r.error;
    panel.querySelector("#sl-name").value = ""; panel.querySelector("#sl-tempo").value = ""; refresh();
  };
  refresh();
};
