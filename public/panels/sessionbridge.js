// Rich panel: Session → Arrangement Bridge — preview the per-scene layout, then flatten all
// Session clips onto the Arrangement timeline. Demo shows a sample layout offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.sessionbridge = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>🌉 Session → Arrangement</h1><p>Lays every Session-view clip onto the Arrangement timeline, scene by scene — MIDI clips with their notes, audio clips from their file.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Scene length</label><input id="sb-len" type="number" placeholder="auto" style="width:64px" />
      <label class="hint">Gap (beats)</label><input id="sb-gap" type="number" value="0" style="width:54px" />
      <button class="btn" id="sb-prev"><i class="ti ti-eye" aria-hidden="true"></i> Preview</button>
      <button class="btn ghost" id="sb-go"><i class="ti ti-arrow-bar-to-right" aria-hidden="true"></i> Flatten to Arrangement</button>
      <span class="hint" id="sb-info"></span>
    </div>
    <div id="sb-timeline" style="margin-top:12px"></div>`;

  function timeline(layout, totalBeats) {
    if (!layout.length) return `<div class="hint" style="padding:10px">No Session clips found.</div>`;
    const W = 640, H = Math.min(220, 26 + layout.reduce((m, l) => Math.max(m, l.clips), 0) * 0); // simple bar
    let r = `<svg viewBox="0 0 ${W} 90" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px">`;
    const span = Math.max(totalBeats, 1);
    layout.forEach((l, i) => {
      const x = (l.startBeat / span) * (W - 8) + 4, w = Math.max(6, (l.length / span) * (W - 8) - 2);
      const col = i % 2 ? "#4ea1ff" : "#5ad17a";
      r += `<rect x="${x.toFixed(1)}" y="20" width="${w.toFixed(1)}" height="40" rx="4" fill="${col}" opacity="0.8"><title>scene ${l.scene}: ${l.clips} clips (${l.midi} midi, ${l.audio} audio)</title></rect>`;
      r += `<text x="${(x + 3).toFixed(1)}" y="45" fill="#0c0c10" font-size="10">S${l.scene} · ${l.clips}</text>`;
    });
    return r + `<text x="4" y="78" fill="#6b6b73" font-size="9">0</text><text x="${W - 40}" y="78" fill="#6b6b73" font-size="9">${Math.round(totalBeats)} beats</text></svg>`;
  }
  function render(d, demo) {
    panel.querySelector("#sb-info").textContent = demo ? "Demo (offline)" : `${d.scenes} scenes · ${d.totalClips || d.clipsCopied} clips · ${Math.round(d.totalBeats)} beats`;
    panel.querySelector("#sb-timeline").innerHTML = timeline(d.layout || d._layout || [], d.totalBeats);
  }
  function args() { const len = panel.querySelector("#sb-len").value; return { scene_length: len ? Number(len) : undefined, gap_beats: Number(panel.querySelector("#sb-gap").value) || 0 }; }
  async function preview() {
    const r = await exec("preview", args());
    if (r.success) render(r.data, false); else demo();
  }
  async function flatten() {
    const r = await exec("flatten", args());
    if (r.success) { panel.querySelector("#sb-info").textContent = `Flattened ${r.data.clipsCopied} clips across ${r.data.scenesProcessed} scenes${r.data.skipped ? ` · ${r.data.skipped} skipped` : ""}`; preview(); }
    else panel.querySelector("#sb-info").textContent = r.error || "Open a Set in Live with Session clips";
  }
  function demo() {
    const layout = [
      { scene: 0, startBeat: 0, length: 8, clips: 4, midi: 3, audio: 1 },
      { scene: 1, startBeat: 8, length: 8, clips: 4, midi: 3, audio: 1 },
      { scene: 2, startBeat: 16, length: 16, clips: 3, midi: 2, audio: 1 },
      { scene: 3, startBeat: 32, length: 8, clips: 4, midi: 4, audio: 0 },
    ];
    render({ scenes: 4, totalClips: 15, totalBeats: 40, layout }, true);
  }
  panel.querySelector("#sb-prev").onclick = preview;
  panel.querySelector("#sb-go").onclick = flatten;
  demo();
};
