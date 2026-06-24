// Rich panel: Score Editor — renders a MIDI clip as real staff notation (self-contained SVG
// engraver) and exports/imports MusicXML for MuseScore/Sibelius/Dorico (engrave + PDF there).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.scoreeditor = function (panel, helpers) {
  const exec = helpers.execute, api = helpers.api;
  const SHARP = [["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0], ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0]];
  const LET = "CDEFGAB";

  panel.innerHTML = `
    <div class="panel-head"><h1>🎼 Score Editor</h1><p>Renders a clip as notation; export to MusicXML (engrave + PDF in MuseScore/Sibelius/Dorico) and import back.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="sc-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Clip</label><input id="sc-clip" type="number" value="0" style="width:50px" />
      <button class="btn" id="sc-load"><i class="ti ti-music" aria-hidden="true"></i> Render</button>
      <button class="btn ghost" id="sc-xml">Export MusicXML</button>
      <button class="btn ghost" id="sc-svg">Export SVG</button>
      <button class="btn ghost" id="sc-import">Import MusicXML</button>
      <span class="hint" id="sc-info"></span>
    </div>
    <div id="sc-score" style="overflow-x:auto"></div>
    <div id="sc-importbox" style="display:none;margin-top:10px">
      <textarea id="sc-xmltext" placeholder="Paste MusicXML here…" style="width:100%;height:90px;background:#13131a;color:#cfcfd4;border:1px solid #38383f;border-radius:8px;padding:8px;font-family:var(--font-mono);font-size:11px"></textarea>
      <button class="btn" id="sc-doimport" style="margin-top:6px">Create MIDI clip from XML</button>
    </div>`;

  let lastSvg = "";

  function diatonic(pitch) { const [l] = SHARP[((pitch % 12) + 12) % 12]; return (Math.floor(pitch / 12) - 1) * 7 + LET.indexOf(l); }
  function durInfo(b) {
    const t = [[4, { open: 1, stem: 0, flags: 0 }], [3, { open: 1, stem: 1, flags: 0, dot: 1 }], [2, { open: 1, stem: 1, flags: 0 }], [1.5, { open: 0, stem: 1, flags: 0, dot: 1 }], [1, { open: 0, stem: 1, flags: 0 }], [0.75, { open: 0, stem: 1, flags: 1, dot: 1 }], [0.5, { open: 0, stem: 1, flags: 1 }], [0.25, { open: 0, stem: 1, flags: 2 }]];
    let best = t[4]; for (const x of t) if (Math.abs(x[0] - b) < Math.abs(best[0] - b)) best = x;
    return best[1];
  }

  function render(d) {
    const notes = (d.notes || []).slice(0, 200);
    panel.querySelector("#sc-info").textContent = `${d.clipName || ""} · ${d.noteCount} notes · ${d.num}/${d.den} · ${Math.round(d.tempo)} BPM`;
    const measureBeats = d.num * (4 / d.den);
    const lastEnd = notes.length ? Math.max(...notes.map((n) => n.start + n.duration)) : measureBeats;
    const measures = Math.max(1, Math.ceil((lastEnd - 1e-6) / measureBeats));
    const LS = 11, clefW = 78, padTop = 46, plotW = Math.max(560, measures * 120);
    const bottomY = padTop + 4 * LS; // E4 line
    const yOf = (pitch) => bottomY - (diatonic(pitch) - 30) * (LS / 2);
    const pxPerBeat = (plotW - clefW - 16) / (measures * measureBeats);
    const xOf = (beat) => clefW + beat * pxPerBeat;
    const W = clefW + (plotW - clefW), H = 200;
    let svg = `<svg viewBox="0 0 ${W} ${H}" style="min-width:${W}px;background:#fbfbf7;border:1px solid #38383f;border-radius:8px">`;
    for (let k = 0; k < 5; k++) svg += `<line x1="8" y1="${padTop + k * LS}" x2="${W - 8}" y2="${padTop + k * LS}" stroke="#222" stroke-width="1" />`;
    svg += `<text x="14" y="${padTop + 3.4 * LS}" font-size="${LS * 4}" fill="#111" font-family="serif">𝄞</text>`;
    svg += `<text x="50" y="${padTop + 1.9 * LS}" font-size="${LS * 2.1}" fill="#111" font-weight="700" text-anchor="middle">${d.num}</text><text x="50" y="${padTop + 3.9 * LS}" font-size="${LS * 2.1}" fill="#111" font-weight="700" text-anchor="middle">${d.den}</text>`;
    for (let m = 1; m <= measures; m++) { const bx = xOf(m * measureBeats); svg += `<line x1="${Math.min(bx, W - 8)}" y1="${padTop}" x2="${Math.min(bx, W - 8)}" y2="${bottomY}" stroke="#222" stroke-width="${m === measures ? 2.4 : 1}" />`; }

    for (const n of notes) {
      const x = xOf(n.start), y = yOf(n.pitch), info = durInfo(n.duration), steps = diatonic(n.pitch) - 30;
      // ledger lines
      if (steps < 0) for (let L = -2; L >= steps; L -= 2) svg += `<line x1="${x - 8}" y1="${bottomY - L * (LS / 2)}" x2="${x + 8}" y2="${bottomY - L * (LS / 2)}" stroke="#222" stroke-width="1" />`;
      if (steps > 8) for (let L = 10; L <= steps; L += 2) svg += `<line x1="${x - 8}" y1="${bottomY - L * (LS / 2)}" x2="${x + 8}" y2="${bottomY - L * (LS / 2)}" stroke="#222" stroke-width="1" />`;
      const alter = SHARP[((n.pitch % 12) + 12) % 12][1];
      if (alter) svg += `<text x="${x - 13}" y="${y + 4}" font-size="${LS * 1.5}" fill="#111" font-family="serif">♯</text>`;
      svg += `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="4" fill="${info.open ? "none" : "#111"}" stroke="#111" stroke-width="1.4" transform="rotate(-20 ${x} ${y})" />`;
      if (info.dot) svg += `<circle cx="${x + 9}" cy="${y - 2}" r="1.4" fill="#111" />`;
      if (info.stem) {
        const up = steps < 4, sx = up ? x + 5 : x - 5, sy2 = up ? y - 3.2 * LS : y + 3.2 * LS;
        svg += `<line x1="${sx}" y1="${y}" x2="${sx}" y2="${sy2}" stroke="#111" stroke-width="1.4" />`;
        for (let f = 0; f < info.flags; f++) { const fy = sy2 + (up ? f * 6 : -f * 6); svg += `<path d="M${sx},${fy} q9,3 7,12" fill="none" stroke="#111" stroke-width="1.6" />`; }
      }
    }
    svg += `</svg>`;
    lastSvg = svg;
    panel.querySelector("#sc-score").innerHTML = svg;
  }

  function demo() {
    const ns = [60, 62, 64, 65, 67, 69, 71, 72].map((p, i) => ({ pitch: p, start: i * 0.5, duration: 0.5, velocity: 100 }));
    ns.push({ pitch: 64, start: 4, duration: 1 }, { pitch: 67, start: 4, duration: 1 }, { pitch: 72, start: 4, duration: 1 });
    render({ notes: ns, num: 4, den: 4, tempo: 120, clipName: "Demo (C major)", noteCount: ns.length });
    panel.querySelector("#sc-info").textContent = "Demo — C major scale + chord";
  }

  async function load() {
    const r = await exec("get_score_data", { track_index: Number(panel.querySelector("#sc-trk").value), clip_index: Number(panel.querySelector("#sc-clip").value) });
    if (r.success) render(r.data); else demo();
  }

  panel.querySelector("#sc-load").onclick = load;
  panel.querySelector("#sc-xml").onclick = async () => {
    const r = await exec("to_musicxml", { track_index: Number(panel.querySelector("#sc-trk").value), clip_index: Number(panel.querySelector("#sc-clip").value) });
    if (!r.success) { panel.querySelector("#sc-info").textContent = r.error; return; }
    const sv = await api.post("/api/score/export", { filename: r.data.filename, content: r.data.xml });
    panel.querySelector("#sc-info").textContent = sv.success ? `Saved ${r.data.filename} → ${sv.data.path} (open in MuseScore for PDF)` : `${r.data.noteCount} notes → MusicXML ready`;
  };
  panel.querySelector("#sc-svg").onclick = async () => {
    if (!lastSvg) { panel.querySelector("#sc-info").textContent = "Render a clip first."; return; }
    const sv = await api.post("/api/score/export", { filename: "score.svg", content: lastSvg });
    panel.querySelector("#sc-info").textContent = sv.success ? `Saved score.svg → ${sv.data.path} (vector → print to PDF)` : "SVG ready";
  };
  panel.querySelector("#sc-import").onclick = () => { const b = panel.querySelector("#sc-importbox"); b.style.display = b.style.display === "none" ? "block" : "none"; };
  panel.querySelector("#sc-doimport").onclick = async () => {
    const xml = panel.querySelector("#sc-xmltext").value;
    const r = await exec("from_musicxml", { xml });
    panel.querySelector("#sc-info").textContent = r.success ? `Imported ${r.data.noteCount} notes → "${r.data.clipName}" (track ${r.data.trackIndex})` : r.error;
  };
  load();
};
