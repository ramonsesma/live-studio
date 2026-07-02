// Rich panel: Groove & Humanize — extract/apply real timing & velocity groove, save templates.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.groove = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🥁 Groove & Humanize</h1><p>Extract a clip's real timing/velocity feel, humanize another, or save it as a reusable template.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="gr-track" type="number" value="0" style="width:70px" />
      <label class="hint">Clip</label><input id="gr-clip" type="number" value="0" style="width:70px" />
      <button class="btn ghost" id="gr-extract">Extract groove</button>
      <button class="btn ghost" id="gr-vel">Extract velocity</button>
      <span class="hint" id="gr-info"></span>
    </div>
    <div id="gr-result" style="margin:8px 0;font-size:12px;color:#9a9aa2"></div>
    <div class="ss-toolbar">
      <label class="hint">Amount</label><input id="gr-amount" type="range" min="0" max="100" value="75" style="width:100px" />
      <label class="hint">Velocity rnd</label><input id="gr-rnd" type="range" min="0" max="100" value="10" style="width:100px" />
      <button class="btn" id="gr-apply">Apply groove (undoable)</button>
    </div>
    <div class="ss-toolbar" style="margin-top:10px">
      <input id="gr-name" type="text" placeholder="Template name" style="width:150px" />
      <button class="btn ghost" id="gr-save">Save as template</button>
    </div>
    <div class="hint" style="margin:10px 0 4px">Saved groove templates</div>
    <div id="gr-list"></div>`;

  const ti = () => Number(panel.querySelector("#gr-track").value)||0;
  const ci = () => Number(panel.querySelector("#gr-clip").value)||0;

  panel.querySelector("#gr-extract").onclick = async () => {
    const r = await exec("extract_groove", { track_index: ti(), clip_index: ci() });
    panel.querySelector("#gr-result").textContent = r.success ? `"${r.data.clipName}": feel = ${r.data.feel} (avg offset ${r.data.avgOffset}), ${r.data.noteCount} notes` : r.error;
  };
  panel.querySelector("#gr-vel").onclick = async () => {
    const r = await exec("extract_velocity", { track_index: ti(), clip_index: ci() });
    const v = r.data?.velocityProfile;
    panel.querySelector("#gr-result").textContent = r.success ? `Velocity: min ${v.min} · max ${v.max} · avg ${v.average} (${v.count} notes)` : r.error;
  };
  panel.querySelector("#gr-apply").onclick = async () => {
    const r = await exec("apply_groove", { track_index: ti(), clip_index: ci(), amount: Number(panel.querySelector("#gr-amount").value), randomize: Number(panel.querySelector("#gr-rnd").value) });
    panel.querySelector("#gr-info").textContent = r.success ? `Applied to ${r.data.notesModified} notes` : r.error;
  };
  panel.querySelector("#gr-save").onclick = async () => {
    const name = panel.querySelector("#gr-name").value.trim();
    if (!name) return;
    const r = await exec("save_groove", { name, track_index: ti(), clip_index: ci() });
    panel.querySelector("#gr-info").textContent = r.success ? `Saved "${name}" (${r.data.noteCount} notes)` : r.error;
    panel.querySelector("#gr-name").value = ""; refreshList();
  };
  async function refreshList() {
    const r = await exec("list_grooves", {});
    const box = panel.querySelector("#gr-list");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    box.innerHTML = r.data.grooves.length ? r.data.grooves.map((g) => `
      <div style="display:flex;gap:10px;border:1px solid #2f2f36;border-radius:7px;padding:6px 10px;background:#13131a;margin-bottom:5px;font-size:12px">
        <span style="flex:1;color:#e8e8ea">${g.name}</span><span class="hint">${g.category} · ${g.source}</span>
      </div>`).join("") : `<span class="hint">No saved grooves yet.</span>`;
  }
  refreshList();
};
