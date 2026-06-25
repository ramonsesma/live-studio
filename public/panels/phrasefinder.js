// Rich panel: MIDI Phrase Finder — search the Set's MIDI clips for a melodic pattern and
// highlight matches by clip color. In-project search (the SDK only sees the open Set).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.phrasefinder = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>🔎 MIDI Phrase Finder</h1><p>Search the Set's MIDI clips for a melodic pattern (transpose-aware) and highlight matches by color.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Pattern</label><input id="pf-p" value="0,7,12,7" placeholder="0,7,12,7  or  C2,G2,C3" style="width:180px" />
      <label class="hint"><input id="pf-t" type="checkbox" checked /> transpose-aware</label>
      <button class="btn" id="pf-go"><i class="ti ti-search" aria-hidden="true"></i> Search</button>
      <span class="hint" id="pf-info">e.g. 0,7,12,7 = root, up a 5th, octave, back to 5th</span>
    </div>
    <div id="pf-out"></div>`;

  function render(d, demo) {
    panel.querySelector("#pf-info").textContent = `${d.count} match${d.count === 1 ? "" : "es"} · pattern [${d.pattern.join(", ")}]${demo ? " (demo)" : ""}`;
    const box = panel.querySelector("#pf-out");
    if (!d.matches.length) { box.innerHTML = `<div class="hint" style="margin-top:8px">No matches in this Set.</div>`; return; }
    box.innerHTML = d.matches.map((m) => `
      <div style="display:grid;grid-template-columns:1fr 130px 70px 80px;gap:8px;align-items:center;padding:7px 8px;border-bottom:1px solid #232329">
        <span><span style="color:#e8e8ea;font-size:13px">${m.clipName || "clip"}</span> <span class="hint" style="font-size:11px">· ${m.pitches.join(" ")}</span></span>
        <span class="hint" style="font-size:11px">${m.trackName} (trk ${m.trackIndex})</span>
        <span class="hint" style="font-size:11px">@ ${m.startBeat}b</span>
        <button class="btn ghost pf-hl" data-trk="${m.trackIndex}" data-clip="${m.clipIndex}" style="padding:2px 9px;font-size:11px">Highlight</button>
      </div>`).join("");
    panel.querySelectorAll(".pf-hl").forEach((b) => { b.onclick = async () => { const r = await exec("highlight_match", { track_index: Number(b.dataset.trk), clip_index: Number(b.dataset.clip) }); if (r.success) { b.textContent = "✓"; b.disabled = true; } }; });
  }

  function demo() {
    render({ count: 3, pattern: [0, 7, 12, 7], matches: [
      { clipName: "Bass Groove", trackName: "Bass", trackIndex: 1, clipIndex: 0, startBeat: 0, pitches: ["C2", "G2", "C3", "G2"] },
      { clipName: "Synth Hook", trackName: "Lead", trackIndex: 3, clipIndex: 0, startBeat: 8, pitches: ["E3", "B3", "E4", "B3"] },
      { clipName: "Pad", trackName: "Pad", trackIndex: 5, clipIndex: 2, startBeat: 4, pitches: ["A2", "E3", "A3", "E3"] },
    ] }, true);
  }

  async function go() {
    const r = await exec("find_phrase", { pattern: panel.querySelector("#pf-p").value, transpose_aware: panel.querySelector("#pf-t").checked });
    if (r.success && r.data.matches.length) render(r.data, false);
    else if (r.success) { panel.querySelector("#pf-info").textContent = `0 matches for [${r.data.pattern.join(", ")}]`; panel.querySelector("#pf-out").innerHTML = `<div class="hint" style="margin-top:8px">No matches in this Set — try transpose-aware or a different pattern.</div>`; }
    else demo();
  }
  panel.querySelector("#pf-go").onclick = go;
  demo();
};
