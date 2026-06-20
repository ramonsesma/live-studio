// Rich panel: Notation Viewer — mini piano-roll of the clip notes.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.notation = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎼 Notation Viewer</h1><p>Piano-roll of the clip's notes. Color = velocity, height = pitch.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="nt-track" type="number" value="0" style="width:70px" />
      <label class="hint">Clip</label><input id="nt-clip" type="number" value="0" style="width:70px" />
      <button class="btn" id="nt-load">Load notes</button>
      <span class="hint" id="nt-info"></span>
    </div>
    <div id="nt-roll" class="cg-svg"><span class="hint">Click "Load notes".</span></div>`;

  async function load() {
    const r = await exec("get_clip_notes", { track_index: Number(panel.querySelector("#nt-track").value)||0, clip_index: Number(panel.querySelector("#nt-clip").value)||0 });
    const wrap = panel.querySelector("#nt-roll");
    if (!r.success) { wrap.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    const notes = r.data.notes;
    panel.querySelector("#nt-info").textContent = `${r.data.noteCount} notes · ${r.data.keySignature} · ${r.data.timeSignature}`;
    const pitches = notes.map(n => n.pitch);
    const minP = Math.min(...pitches) - 1, maxP = Math.max(...pitches) + 1;
    const maxT = Math.max(...notes.map(n => n.start + n.duration), 1);
    const W = 800, H = 260, pad = 8;
    const rows = (maxP - minP) || 1;
    const rowH = (H - 2 * pad) / rows;
    const x = t => pad + (t / maxT) * (W - 2 * pad);
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="cg-canvas">`;
    // líneas de pentagrama suaves
    for (let p = minP; p <= maxP; p++) {
      const yy = pad + (maxP - p) * rowH;
      if (p % 12 === 0) svg += `<line x1="${pad}" y1="${yy}" x2="${W-pad}" y2="${yy}" stroke="#38383f" stroke-width="1"/>`;
    }
    for (const n of notes) {
      const yy = pad + (maxP - n.pitch) * rowH;
      const ww = Math.max(4, (n.duration / maxT) * (W - 2 * pad));
      const hue = 200 - (n.velocity / 127) * 160;
      svg += `<rect x="${x(n.start)}" y="${yy}" width="${ww}" height="${Math.max(4, rowH-1)}" rx="2" fill="hsl(${hue},70%,55%)"><title>${n.note} v=${n.velocity}</title></rect>`;
    }
    svg += `</svg>`;
    wrap.innerHTML = svg;
  }
  panel.querySelector("#nt-load").onclick = load;
  load();
};
