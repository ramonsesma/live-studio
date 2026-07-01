// Rich panel: Stem Export — batch-renders every audio track to a real WAV on disk with
// automatic naming. MIDI tracks are listed as needing a resample first (not faked).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.stemexport = function (panel, helpers) {
  const api = helpers.api;
  const exportStems = (body) => api.post("/api/stemexport", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>📤 Stem Export</h1><p>Renders every audio track's pre-fx audio to a real WAV file on disk, named automatically.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Tracks</label><input id="se-idx" type="text" placeholder="e.g. 0,1,2 (blank = all)" style="width:140px" />
      <label class="hint">Name pattern</label><input id="se-pattern" type="text" placeholder="{index}_{name}" style="width:140px" />
      <button class="btn" id="se-export"><i class="ti ti-download" aria-hidden="true"></i> Export</button>
      <button class="btn ghost" id="se-demo">Demo</button>
      <span class="hint" id="se-info"></span>
    </div>
    <div id="se-candidates" style="margin:8px 0;font-size:11px;color:#9a9aa2"></div>
    <div id="se-results" style="margin-top:8px;display:flex;flex-direction:column;gap:5px"></div>`;

  async function refreshCandidates() {
    const r = await api.post("/api/execute", { name: "stemexport__list_export_candidates", args: {} });
    if (!r.success) return;
    panel.querySelector("#se-candidates").textContent = `${r.data.exportable}/${r.data.total} tracks are exportable (audio). MIDI tracks need resampling to audio first.`;
  }

  function renderResults(data) {
    const box = panel.querySelector("#se-results");
    if (!data || !data.files?.length) { box.innerHTML = `<span class="hint">No files exported.</span>`; return; }
    box.innerHTML = `<div style="font-size:12px;color:#82c98a;margin-bottom:4px">${data.count} file(s) → ${data.folder}</div>` +
      data.files.map((f) => `<div style="display:flex;gap:10px;align-items:center;border:1px solid #2f2f36;border-radius:7px;padding:6px 10px;background:#13131a">
        <span style="flex:1;color:#e8e8ea;font-size:12px">${f.fileName}</span>
        <span class="hint" style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:320px">${f.file}</span>
      </div>`).join("");
    if (data.skippedMidiTracks) box.innerHTML += `<div class="hint" style="margin-top:6px">${data.skippedMidiTracks} MIDI track(s) skipped — resample to audio first.</div>`;
  }

  async function doExport() {
    panel.querySelector("#se-info").textContent = "Rendering & exporting…";
    const idx = panel.querySelector("#se-idx").value.trim();
    const pattern = panel.querySelector("#se-pattern").value.trim();
    const r = await exportStems({ trackIndices: idx ? idx.split(",").map((s) => +s.trim()) : undefined, namePattern: pattern || undefined });
    panel.querySelector("#se-info").textContent = r.success ? `Exported ${r.data.count} file(s)` : r.error;
    if (r.success) renderResults(r.data);
  }
  async function doDemo() {
    panel.querySelector("#se-info").textContent = "Demo: synthetic stems (proves the export path offline).";
    const r = await exportStems({ demo: true });
    if (r.success) renderResults(r.data);
  }

  panel.querySelector("#se-export").onclick = doExport;
  panel.querySelector("#se-demo").onclick = doDemo;
  refreshCandidates();
  doDemo();
};
