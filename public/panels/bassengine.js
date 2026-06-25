// Rich panel: Bass Engine — generate a bassline and mutate it. Piano-roll preview; ghost notes
// render dimmer. Demo builds an octave-jump line offline so it previews without Live.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.bassengine = function (panel, helpers) {
  const exec = helpers.execute;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  panel.innerHTML = `
    <div class="panel-head"><h1>🎸 Bass Engine</h1><p>Basslines that feel physical — scale-aware notes with octave jumps, ghost hits and sub-hold, written as a new clip. Mutate reshapes it while keeping the contour (undoable).</p></div>
    <div class="ss-toolbar">
      <label class="hint">Root</label><select id="be-root">${["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"].map((n) => `<option${n === "C" ? " selected" : ""}>${n}</option>`).join("")}</select>
      <label class="hint">Scale</label><select id="be-scale"><option>minor</option><option>major</option><option>dorian</option><option>phrygian</option><option>mixolydian</option></select>
      <label class="hint">Style</label><select id="be-style"><option value="octave" selected>octave</option><option value="root">root</option><option value="walking">walking</option><option value="driving">driving</option><option value="sub">sub</option></select>
      <label class="hint">Bars</label><select id="be-bars"><option>1</option><option selected>2</option><option>4</option></select>
    </div>
    <div class="ss-toolbar" style="margin-top:8px">
      <label class="hint">Density</label><input id="be-dens" type="range" min="0" max="100" value="60" /><span class="hint" id="be-densv">60</span>
      <label class="hint">Ghosts</label><input id="be-gh" type="range" min="0" max="100" value="30" /><span class="hint" id="be-ghv">30</span>
      <label class="hint">Humanize</label><input id="be-hum" type="range" min="0" max="40" value="10" />
      <button class="btn" id="be-gen"><i class="ti ti-guitar-pick" aria-hidden="true"></i> Generate</button>
      <button class="btn ghost" id="be-mut"><i class="ti ti-dice" aria-hidden="true"></i> Mutate</button>
      <span class="hint" id="be-info"></span>
    </div>
    <div id="be-roll" style="margin-top:12px"></div>`;

  function roll(notes) {
    if (!notes.length) return "";
    const ps = notes.map((n) => n.pitch), lo = Math.min(...ps) - 1, hi = Math.max(...ps) + 1, range = Math.max(1, hi - lo);
    const span = Math.max(...notes.map((n) => n.start + n.dur), 4), W = 640, rowH = 12, H = range * rowH + 10;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px">`;
    for (let p = lo; p <= hi; p++) { const y = (hi - p) * rowH + 5, black = [1,3,6,8,10].includes(((p % 12) + 12) % 12); r += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="${black ? "#17171e" : "#15151b"}" />`; if (((p % 12) + 12) % 12 === 0) r += `<text x="3" y="${y + 9}" fill="#5b5b63" font-size="8">C${Math.floor(p / 12) - 1}</text>`; }
    for (const n of notes) { const x = (n.start / span) * (W - 6) + 3, w = Math.max(3, (n.dur / span) * (W - 6) - 1), y = (hi - n.pitch) * rowH + 6; r += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rowH - 2}" rx="2" fill="${n.ghost ? "#5a6a8a" : "#e0a23a"}" opacity="${n.ghost ? 0.55 : (0.5 + (n.vel / 127) * 0.5).toFixed(2)}"><title>${NN[((n.pitch % 12) + 12) % 12]}${Math.floor(n.pitch / 12) - 1} · vel ${n.vel}${n.ghost ? " · ghost" : ""}</title></rect>`; }
    return r + `</svg>`;
  }
  function render(d, demo) {
    panel.querySelector("#be-info").textContent = demo ? "Demo (offline)" : `${d.noteCount} notes · ${d.ghosts} ghosts · ${d.style}${d.clipName ? " → " + d.clipName : ""}`;
    panel.querySelector("#be-roll").innerHTML = roll(d.notes);
  }
  async function gen() {
    const r = await exec("generate", { root: panel.querySelector("#be-root").value, scale: panel.querySelector("#be-scale").value, style: panel.querySelector("#be-style").value, bars: Number(panel.querySelector("#be-bars").value), density: Number(panel.querySelector("#be-dens").value), ghosts: Number(panel.querySelector("#be-gh").value), humanize: Number(panel.querySelector("#be-hum").value) });
    if (r.success) { render(r.data, false); lastTrack = r.data.trackIndex; } else demo();
  }
  let lastTrack = null;
  async function mutate() {
    if (lastTrack == null) { panel.querySelector("#be-info").textContent = "Generate a bass first."; return; }
    const r = await exec("mutate", { track_index: lastTrack, clip_index: 0, amount: 35 });
    panel.querySelector("#be-info").textContent = r.success ? `Mutated ${r.data.notesChanged} notes (undoable)` : (r.error || "Mutate failed");
  }
  function demo() {
    const base = 36, seq = [];
    for (let b = 0; b < 2; b++) for (const [s, oct, gh] of [[0,0,0],[3,0,1],[4,12,0],[7,0,1],[8,0,0],[11,12,0],[12,0,0],[14,0,1]]) seq.push({ pitch: base + oct, start: (b * 16 + s) * 0.25, dur: gh ? 0.12 : 0.4, vel: gh ? 48 : (s === 0 ? 110 : 92), ghost: !!gh });
    render({ noteCount: seq.length, ghosts: seq.filter((n) => n.ghost).length, style: "octave", notes: seq }, true);
  }
  panel.querySelector("#be-dens").oninput = (e) => (panel.querySelector("#be-densv").textContent = e.target.value);
  panel.querySelector("#be-gh").oninput = (e) => (panel.querySelector("#be-ghv").textContent = e.target.value);
  panel.querySelector("#be-gen").onclick = gen;
  panel.querySelector("#be-mut").onclick = mutate;
  demo();
};
