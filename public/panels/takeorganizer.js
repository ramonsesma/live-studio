// Rich panel: Take Lane Organizer — list a track's take lanes and auto-label them by content.
// Demo shows a few lanes offline so it previews without Live.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.takeorganizer = function (panel, helpers) {
  const exec = helpers.execute;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const nm = (p) => p == null ? "—" : NN[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1);

  panel.innerHTML = `
    <div class="panel-head"><h1>🗄️ Take Lane Organizer</h1><p>Enumerates a track's take lanes (<code>track.takeLanes</code>) and auto-names them from their content — register + note density — instead of "Take 1, Take 2…".</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="to-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Scheme</label><select id="to-scheme"><option value="content" selected>By content</option><option value="index">By index</option></select>
      <button class="btn" id="to-list">List lanes</button>
      <button class="btn" id="to-go"><i class="ti ti-tag" aria-hidden="true"></i> Auto-label</button>
      <span class="hint" id="to-info"></span>
    </div>
    <div id="to-lanes" style="margin-top:10px;display:flex;flex-direction:column;gap:6px"></div>`;

  function render(lanes, demo) {
    panel.querySelector("#to-info").textContent = demo ? "Demo (offline)" : `${lanes.length} take lanes`;
    panel.querySelector("#to-lanes").innerHTML = lanes.length ? lanes.map((l) => `
      <div style="display:flex;align-items:center;gap:12px;border:1px solid #2f2f36;border-radius:8px;padding:9px 12px;background:#13131a">
        <span style="width:22px;height:22px;border-radius:6px;background:#23232b;color:#9a9aa3;font-size:11px;display:flex;align-items:center;justify-content:center">${l.index + 1}</span>
        <span style="flex:1;color:#e8e8ea;font-size:13px">${l.name || "(unnamed lane)"}</span>
        <span class="hint">${l.clipCount} clip${l.clipCount === 1 ? "" : "s"}</span>
        <span class="hint">${l.hasMidi ? `${l.notes} notes · ${nm(l.lo)}–${nm(l.hi)}` : "audio"}</span>
      </div>`).join("") : `<div class="hint" style="padding:10px">No take lanes on this track. Record comp takes in Live's Arrangement to create them.</div>`;
  }
  async function list() {
    const r = await exec("list", { track_index: +panel.querySelector("#to-trk").value });
    if (r.success) render(r.data.lanes, false); else demo();
  }
  async function label() {
    const r = await exec("autolabel", { track_index: +panel.querySelector("#to-trk").value, scheme: panel.querySelector("#to-scheme").value });
    if (r.success) { panel.querySelector("#to-info").textContent = `Renamed ${r.data.renamed} lanes`; list(); } else demo();
  }
  function demo() {
    render([
      { index: 0, name: "1 · Mid (24n)", clipCount: 1, hasMidi: true, notes: 24, lo: 60, hi: 72 },
      { index: 1, name: "2 · Low (18n)", clipCount: 1, hasMidi: true, notes: 18, lo: 41, hi: 55 },
      { index: 2, name: "3 · High (31n)", clipCount: 2, hasMidi: true, notes: 31, lo: 72, hi: 88 },
    ], true);
  }
  panel.querySelector("#to-list").onclick = list;
  panel.querySelector("#to-go").onclick = label;
  demo();
};
