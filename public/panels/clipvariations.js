// Rich panel: Clip Variation Engine — N algorithmic variations of a MIDI clip, each shown
// as a mini piano-roll and written as a real new clip. Demo computes a few offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.clipvariations = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>🎰 Clip Variation Engine</h1><p>Spins up algorithmic variations of a MIDI clip — each becomes a real new clip to compare.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="cv-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Clip</label><input id="cv-clip" type="number" value="0" style="width:50px" />
      <label class="hint">Count</label><select id="cv-n"><option>2</option><option selected>4</option><option>6</option></select>
      <button class="btn" id="cv-gen"><i class="ti ti-dice" aria-hidden="true"></i> Generate</button>
      <span class="hint" id="cv-info"></span>
    </div>
    <div id="cv-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:8px"></div>`;

  function roll(notes, span) {
    if (!notes.length) return `<div class="hint" style="font-size:11px;padding:10px">empty</div>`;
    const ps = notes.map((n) => n.pitch), lo = Math.min(...ps), hi = Math.max(...ps), range = Math.max(1, hi - lo);
    const W = 210, H = 64;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:6px">`;
    for (const n of notes) {
      const x = (n.start / span) * (W - 4), w = Math.max(2, (n.duration / span) * (W - 4) - 1), y = 4 + ((hi - n.pitch) / range) * (H - 12);
      r += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="5" rx="1.5" fill="#5ad17a" opacity="0.85" />`;
    }
    return r + `</svg>`;
  }

  function renderCards(source, span, vars, demo) {
    panel.querySelector("#cv-info").textContent = demo ? "Demo (offline) — variations of a C-major arpeggio" : `from ${source.track} · ${source.clip} (${source.noteCount} notes) → ${vars.length} variations`;
    panel.querySelector("#cv-grid").innerHTML = vars.map((v) => `
      <div style="border:1px solid #2f2f36;border-radius:8px;padding:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="color:#e8e8ea;font-size:12px"><i class="ti ti-wand" style="color:#ffb347" aria-hidden="true"></i> ${v.label}</span>
          <span class="hint" style="font-size:10px">${v.noteCount} notes${v.trackIndex != null ? " · trk " + v.trackIndex : ""}</span>
        </div>
        ${roll(v.notes, span)}
      </div>`).join("");
  }

  async function gen() {
    const r = await exec("generate_variations", { track_index: Number(panel.querySelector("#cv-trk").value), clip_index: Number(panel.querySelector("#cv-clip").value), count: Number(panel.querySelector("#cv-n").value) });
    if (r.success) renderCards(r.data.source, r.data.span, r.data.variations, false);
    else demo();
  }

  function demo() {
    // client-side preview of a few transforms on a C-major arpeggio (no Live needed)
    const src = [60, 64, 67, 72, 67, 64].map((p, i) => ({ pitch: p, start: i * 0.5, duration: 0.5 }));
    const span = 3;
    const rev = src.map((n) => ({ ...n, start: span - (n.start + n.duration) }));
    const oct = src.map((n) => ({ ...n, pitch: n.pitch + 12 }));
    const rot = src.map((n, i) => ({ ...n, pitch: src[(i + 2) % src.length].pitch }));
    const ech = src.concat(src.map((n) => ({ ...n, start: n.start + 0.5 })));
    renderCards({}, span, [
      { label: "Reverse", noteCount: rev.length, notes: rev },
      { label: "Octave up", noteCount: oct.length, notes: oct },
      { label: "Rotate pitches", noteCount: rot.length, notes: rot },
      { label: "Echo", noteCount: ech.length, notes: ech },
    ], true);
  }

  panel.querySelector("#cv-gen").onclick = gen;
  demo();
};
