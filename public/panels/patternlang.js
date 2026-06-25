// Rich panel: Pattern Language — type a mini-notation pattern, compile it to a MIDI clip and
// preview it in a piano roll. Client-side compiler mirrors the module so it previews offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.patternlang = function (panel, helpers) {
  const exec = helpers.execute;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const PCB = { c:0, d:2, e:4, f:5, g:7, a:9, b:11 };

  panel.innerHTML = `
    <div class="panel-head"><h1>🪄 Pattern Language</h1><p>A TidalCycles-style mini-notation that compiles to a MIDI clip. Tokens split the cycle: <code>note</code>, rest <code>~</code>, subdivide <code>[a b]</code>, repeat <code>x*3</code>.</p></div>
    <div class="ss-toolbar">
      <input id="pl-pat" type="text" value="c3 e3 [g3 b3] c4" style="flex:1;min-width:240px;font-family:monospace" />
      <label class="hint">Bars</label><select id="pl-bars"><option selected>1</option><option>2</option><option>4</option></select>
      <button class="btn" id="pl-go"><i class="ti ti-player-play" aria-hidden="true"></i> Compile</button>
      <span class="hint" id="pl-info"></span>
    </div>
    <div class="ss-toolbar" style="margin-top:6px">
      ${["c3 e3 g3 c4", "c2*4 ~ c2*2 ~", "[c3 e3 g3] [f3 a3 c4]", "c3 ~ e3 [g3 b3 d4]"].map((p) => `<button class="btn ghost pl-ex" data-p="${p}" style="font-family:monospace;font-size:11px">${p}</button>`).join("")}
    </div>
    <div id="pl-roll" style="margin-top:12px"></div>`;

  function parseNote(tok) { if (/^-?\d+$/.test(tok)) { const p = +tok; return p >= 0 && p <= 127 ? p : null; } const m = tok.toLowerCase().match(/^([a-g])([#b]?)(-?\d+)$/); if (!m) return null; let pc = PCB[m[1]]; if (m[2] === "#") pc++; else if (m[2] === "b") pc--; const v = (parseInt(m[3], 10) + 1) * 12 + pc; return v >= 0 && v <= 127 ? v : null; }
  function tok(str) { const out = []; let buf = "", d = 0; for (const ch of str.trim()) { if (ch === "[") { d++; buf += ch; } else if (ch === "]") { d--; buf += ch; } else if (/\s/.test(ch) && d === 0) { if (buf) { out.push(buf); buf = ""; } } else buf += ch; } if (buf) out.push(buf); return out; }
  function parse(t) { if (t === "~" || t === ".") return { type: "rest" }; if (t.startsWith("[") && t.endsWith("]")) return { type: "group", children: tok(t.slice(1, -1)).map(parse) }; const s = t.indexOf("*"); if (s > 0) { const b = parse(t.slice(0, s)); const n = Math.max(1, Math.min(32, +t.slice(s + 1) || 1)); return { type: "group", children: Array.from({ length: n }, () => b) }; } const p = parseNote(t); return p == null ? { type: "rest" } : { type: "note", pitch: p }; }
  function compileLocal(pattern, bars) { const nodes = tok(pattern).map(parse); const span = bars * 4, notes = []; const emit = (ns, start, len) => { const sl = len / ns.length; ns.forEach((n, i) => { const s = start + i * sl; if (n.type === "note") notes.push({ pitch: n.pitch, start: +s.toFixed(3), dur: +(sl * 0.9).toFixed(3) }); else if (n.type === "group") emit(n.children, s, sl); }); }; emit(nodes, 0, span); return { notes, span }; }

  function roll(notes, span) {
    if (!notes.length) return `<div class="hint" style="padding:10px">No notes (all rests?).</div>`;
    const ps = notes.map((n) => n.pitch), lo = Math.min(...ps) - 1, hi = Math.max(...ps) + 1, range = Math.max(1, hi - lo);
    const W = 640, rowH = 13, H = range * rowH + 10;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px">`;
    for (let p = lo; p <= hi; p++) { const y = (hi - p) * rowH + 5, black = [1,3,6,8,10].includes(((p % 12) + 12) % 12); r += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="${black ? "#17171e" : "#15151b"}" />`; if (((p % 12) + 12) % 12 === 0) r += `<text x="3" y="${y + 9}" fill="#5b5b63" font-size="8">C${Math.floor(p / 12) - 1}</text>`; }
    for (const n of notes) { const x = (n.start / span) * (W - 6) + 3, w = Math.max(4, (n.dur / span) * (W - 6) - 1), y = (hi - n.pitch) * rowH + 6; r += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rowH - 2}" rx="2" fill="#c792ea" opacity="0.9"><title>${NN[((n.pitch % 12) + 12) % 12]}${Math.floor(n.pitch / 12) - 1}</title></rect>`; }
    return r + `</svg>`;
  }
  function preview(demo) { const pat = panel.querySelector("#pl-pat").value, bars = Number(panel.querySelector("#pl-bars").value); const c = compileLocal(pat, bars); panel.querySelector("#pl-roll").innerHTML = roll(c.notes, c.span); if (demo) panel.querySelector("#pl-info").textContent = `${c.notes.length} notes (preview)`; }
  async function compile() {
    const r = await exec("compile", { pattern: panel.querySelector("#pl-pat").value, bars: Number(panel.querySelector("#pl-bars").value) });
    if (r.success) { panel.querySelector("#pl-info").textContent = `${r.data.noteCount} notes → ${r.data.clipName}`; panel.querySelector("#pl-roll").innerHTML = roll(r.data.notes.map((n) => ({ pitch: n.pitch, start: n.start, dur: n.dur })), Number(panel.querySelector("#pl-bars").value) * 4); }
    else preview(true);
  }
  panel.querySelector("#pl-go").onclick = compile;
  panel.querySelector("#pl-pat").oninput = () => preview(true);
  panel.querySelectorAll(".pl-ex").forEach((b) => b.onclick = () => { panel.querySelector("#pl-pat").value = b.dataset.p; preview(true); });
  preview(true);
};
