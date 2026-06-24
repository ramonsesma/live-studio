// Rich panel: Versions & Snapshots — clip version timeline with A/B diff (clipversions),
// plus quick set-snapshot and mix-scene lists. Consolidates clipversions + snapshots +
// mixscene. Version history with diff is a comparison view, not a form.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.clipversions = function (panel, helpers) {
  const exec = helpers.execute;
  const api = helpers.api;
  const call = (name, args) => api.post("/api/execute", { name, args: args || {} });

  panel.innerHTML = `
    <div class="panel-head"><h1>🗃️ Versions & Snapshots</h1><p>Clip version timeline with A/B diff, plus set snapshots and mix scenes.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="v-trk" type="number" min="0" value="0" style="width:50px" />
      <label class="hint">Clip</label><input id="v-clip" type="number" min="0" value="0" style="width:50px" />
      <button class="btn" id="v-save">Save version</button>
      <span class="hint" id="v-info">Pick two versions to diff</span>
    </div>
    <div id="v-timeline" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"></div>
    <div id="v-diff" style="margin-top:10px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
      <div><div class="hint" style="margin-bottom:6px">Set snapshots <button class="btn ghost" id="v-snap" style="padding:2px 8px;font-size:11px">+ Save</button></div><div id="v-snaps"></div></div>
      <div><div class="hint" style="margin-bottom:6px">Mix scenes <button class="btn ghost" id="v-scene" style="padding:2px 8px;font-size:11px">+ Save</button></div><div id="v-scenes"></div></div>
    </div>`;

  let sel = [];
  function tc() { return { track_index: Number(panel.querySelector("#v-trk").value), clip_index: Number(panel.querySelector("#v-clip").value) }; }

  async function listVersions() {
    const r = await exec("list_versions", tc());
    const box = panel.querySelector("#v-timeline");
    const vs = r.success ? r.data.versions || [] : [];
    if (!vs.length) { box.innerHTML = `<span class="hint">No versions yet — click "Save version".</span>`; return; }
    box.innerHTML = "";
    vs.forEach((v) => {
      const card = document.createElement("button");
      card.className = "btn ghost";
      card.style.cssText = "min-width:88px;padding:8px;flex-direction:column;text-align:left";
      card.innerHTML = `<span style="color:#ffb347;font-size:12px">${v.label}</span><span class="hint" style="font-size:10px;display:block">${v.notes} notes · ${v.length}b</span>`;
      card.onclick = () => {
        const i = sel.indexOf(v.id);
        if (i >= 0) sel.splice(i, 1); else { sel.push(v.id); if (sel.length > 2) sel.shift(); }
        card.style.borderColor = sel.includes(v.id) ? "#6cc6ff" : "";
        if (sel.length === 2) doDiff();
        box.querySelectorAll("button").forEach((b, idx) => { b.style.borderColor = sel.includes(vs[idx].id) ? "#6cc6ff" : ""; });
      };
      box.appendChild(card);
    });
  }
  async function doDiff() {
    const r = await exec("diff_versions", { ...tc(), version_a: sel[0], version_b: sel[1] });
    if (!r.success) { panel.querySelector("#v-diff").innerHTML = `<span class="hint">${r.error}</span>`; return; }
    const d = r.data.diff;
    panel.querySelector("#v-diff").innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;padding:8px 10px;border:1px solid #2f2f36;border-radius:8px">
        <span class="hint">v${sel[0]} → v${sel[1]}:</span>
        <span style="color:#5ad17a;font-size:13px">+${d.notesAdded} added</span>
        <span style="color:#e24b4a;font-size:13px">−${d.notesRemoved} removed</span>
        <span style="color:#ffb347;font-size:13px">~${d.notesChanged} changed</span>
        <span class="hint">Δlen ${d.lengthDiff}b</span>
      </div>`;
  }
  async function refreshSnaps() {
    const r = await call("snapshots__list_snapshots");
    const s = r.success ? r.data.snapshots || [] : [];
    panel.querySelector("#v-snaps").innerHTML = s.length
      ? s.map((x) => `<div style="font-size:12px;color:#cfcfd4;padding:3px 0">📸 ${x.name} <span class="hint">· ${x.trackCount} trk</span></div>`).join("")
      : `<span class="hint" style="font-size:11px">none</span>`;
  }
  async function refreshScenes() {
    const r = await call("mixscene__list_scenes");
    const s = r.success ? r.data.scenes || [] : [];
    panel.querySelector("#v-scenes").innerHTML = s.length
      ? s.map((x) => `<div style="font-size:12px;color:#cfcfd4;padding:3px 0">🎚️ ${x.name} <span class="hint">· ${x.tracks.length} trk</span></div>`).join("")
      : `<span class="hint" style="font-size:11px">none</span>`;
  }

  panel.querySelector("#v-save").onclick = async () => {
    const r = await exec("save_version", { ...tc(), label: "" });
    panel.querySelector("#v-info").textContent = r.success ? `saved ${r.data.version.label} (${r.data.totalVersions} total)` : r.error;
    sel = []; listVersions();
  };
  panel.querySelector("#v-snap").onclick = async () => { await call("snapshots__save_snapshot", { name: "Snapshot " + (Math.floor(Math.random() * 90) + 1) }); refreshSnaps(); };
  panel.querySelector("#v-scene").onclick = async () => { await call("mixscene__save_scene", { name: "Mix " + (Math.floor(Math.random() * 90) + 1) }); refreshScenes(); };
  panel.querySelectorAll("#v-trk,#v-clip").forEach((el) => { el.onchange = () => { sel = []; listVersions(); panel.querySelector("#v-diff").innerHTML = ""; }; });

  listVersions(); refreshSnaps(); refreshScenes();
};
