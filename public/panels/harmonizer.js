// Rich panel: Harmonizer — a harmony + arp workstation. Detect chords in a clip, get
// functional-harmony suggestions, generate expressive voicings, and drive the generative arp
// engine (miditransform__generate_arp via /api/execute). All sections preview offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.harmonizer = function (panel, helpers) {
  const exec = helpers.execute, api = helpers.api;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const nm = (p) => NN[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1);
  const card = (title, body) => `<div style="border:1px solid #2a2a32;border-radius:10px;padding:12px 13px;margin-top:12px;background:#101015"><div style="font-size:12px;color:#c4a4e8;font-weight:500;margin-bottom:9px"><i class="ti ti-${title.icon}" style="vertical-align:-2px;margin-right:5px" aria-hidden="true"></i>${title.label}</div>${body}</div>`;
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map((o) => `<option${o === cur ? " selected" : ""}>${o}</option>`).join("")}</select>`;
  const numI = (id, v, w) => `<input id="${id}" type="number" value="${v}" style="width:${w || 46}px" />`;
  const txtI = (id, v, w) => `<input id="${id}" type="text" value="${v}" style="width:${w || 120}px;font-family:monospace" />`;

  panel.innerHTML = `
    <div class="panel-head"><h1>🎵 Harmony & Arp</h1><p>Detect chords, get functional-harmony suggestions, voice expressive progressions, and run the generative arp engine.</p></div>
    ${card({ icon: "search", label: "Detect chords in a clip" }, `
      <div class="ss-toolbar"><label class="hint">Track</label>${numI("h-dtrk", 0)}<label class="hint">Clip</label>${numI("h-dclip", 0)}
        <button class="btn" id="h-detect"><i class="ti ti-search" aria-hidden="true"></i> Detect</button><span class="hint" id="h-dinfo"></span></div>
      <div id="h-dchips" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px"></div>`)}
    ${card({ icon: "arrow-guide", label: "Suggest the next chord" }, `
      <div class="ss-toolbar"><label class="hint">Key</label>${sel("h-skey", NN, "C")}<label class="hint">Scale</label>${sel("h-sscale", ["major","minor"], "major")}<label class="hint">Current</label>${sel("h-scur", ["I","ii","iii","IV","V","vi","vii"], "V")}
        <button class="btn" id="h-suggest"><i class="ti ti-arrow-guide" aria-hidden="true"></i> Suggest</button></div>
      <div id="h-schips" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px"></div>`)}
    ${card({ icon: "stack-2", label: "Generate expressive chords" }, `
      <div class="ss-toolbar"><label class="hint">Key</label>${sel("h-ekey", NN, "C")}<label class="hint">Scale</label>${sel("h-escale", ["major","minor"], "minor")}<label class="hint">Degrees</label>${txtI("h-edeg", "i,VI,III,VII", 120)}</div>
      <div class="ss-toolbar" style="margin-top:6px"><label class="hint">Spread</label>${sel("h-espread", ["close","open","drop2","spread"], "open")}<label class="hint">Complexity</label>${sel("h-ecomp", ["triad","7th","9th","11th"], "7th")}<label class="hint">Inv</label>${numI("h-einv", 0)}<label class="hint">Human</label>${numI("h-ehf", 25)}</div>
      <div class="ss-toolbar" style="margin-top:6px"><label class="hint"><input type="checkbox" id="h-ebass" /> bass root</label><label class="hint"><input type="checkbox" id="h-etop" /> top line</label><label class="hint"><input type="checkbox" id="h-earp" /> arp</label>${sel("h-earate", ["1/8","1/16"], "1/16")}
        <button class="btn" id="h-egen"><i class="ti ti-stack-2" aria-hidden="true"></i> Generate</button><span class="hint" id="h-einfo"></span></div>
      <div id="h-eroll" style="margin-top:10px"></div>`)}
    ${card({ icon: "arrows-up-down", label: "Generative arp engine" }, `
      <div class="ss-toolbar"><label class="hint">Root</label>${sel("h-aroot", NN, "C")}<label class="hint">Chord</label>${sel("h-achord", ["maj","min","maj7","min7","dom7","sus2","sus4","dim","add9"], "min7")}<label class="hint">Bars</label>${sel("h-abars", ["1","2","4"], "2")}</div>
      <div class="ss-toolbar" style="margin-top:6px"><label class="hint">Pattern</label>${sel("h-apat", ["up","down","updown","converge","random"], "up")}<label class="hint">Rate</label>${sel("h-arate", ["1/8","1/16","1/16t","1/4"], "1/16")}<label class="hint">Octaves</label>${numI("h-aoct", 2)}<label class="hint">Variations</label>${sel("h-avar", ["1","2","3","4"], "3")}
        <button class="btn" id="h-agen"><i class="ti ti-arrows-up-down" aria-hidden="true"></i> Generate arps</button><span class="hint" id="h-ainfo"></span></div>
      <div id="h-agrid" style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px"></div>`)}`;

  function roll(notes, span, color, h) {
    if (!notes.length) return `<div class="hint" style="padding:8px">No notes.</div>`;
    const ps = notes.map((n) => n.pitch), lo = Math.min(...ps) - 1, hi = Math.max(...ps) + 1, rowH = h || 11, W = 600, H = (hi - lo) * rowH + 8;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:6px">`;
    for (let p = lo; p <= hi; p++) { const y = (hi - p) * rowH + 4, black = [1,3,6,8,10].includes(((p % 12) + 12) % 12); r += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="${black ? "#17171e" : "#15151b"}"/>`; if (((p % 12) + 12) % 12 === 0) r += `<text x="2" y="${y + rowH - 2}" fill="#5b5b63" font-size="7">C${Math.floor(p / 12) - 1}</text>`; }
    for (const n of notes) { const x = (n.start / span) * (W - 4) + 2, w = Math.max(3, (n.dur / span) * (W - 4) - 1), y = (hi - n.pitch) * rowH + 5; r += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rowH - 2}" rx="2" fill="${color}" opacity="0.9"><title>${nm(n.pitch)}</title></rect>`; }
    return r + `</svg>`;
  }
  const chip = (txt, col, tip) => `<span title="${tip || ""}" style="font-size:11px;border:1px solid ${col}55;color:${col};background:${col}14;border-radius:6px;padding:3px 9px">${txt}</span>`;

  // A · detect
  async function detect() {
    const r = await exec("detect_chords", { track_index: +panel.querySelector("#h-dtrk").value, clip_index: +panel.querySelector("#h-dclip").value });
    if (!r.success) { panel.querySelector("#h-dchips").innerHTML = ["Cmaj7","Am7","Dm7","G7"].map((c) => chip(c, "#c792ea")).join(""); panel.querySelector("#h-dinfo").textContent = "Demo (offline)"; return; }
    panel.querySelector("#h-dinfo").textContent = r.data.progression || `${r.data.chordCount} groups`;
    panel.querySelector("#h-dchips").innerHTML = r.data.chords.map((c) => chip(c.chord, c.chord === "—" ? "#6b6b73" : "#c792ea", `bass ${c.bass} · ${c.noteCount} notes`)).join("");
  }
  // B · suggest
  async function suggest() {
    const r = await exec("suggest_next", { key: panel.querySelector("#h-skey").value, scale: panel.querySelector("#h-sscale").value, current: panel.querySelector("#h-scur").value });
    const col = { tonic: "#5ad17a", subdominant: "#e0a23a", dominant: "#e8617a" };
    const data = r.success ? r.data : { current: { roman: "V", chord: "G" }, suggestions: [{ roman: "I", chord: "C", function: "tonic" }, { roman: "vi", chord: "Am", function: "tonic" }] };
    panel.querySelector("#h-schips").innerHTML = `<span class="hint" style="align-self:center">${data.current.roman} (${data.current.chord}) →</span>` +
      data.suggestions.map((s) => `<span class="h-snext" data-r="${s.roman.replace(/[^IiVv]/g, "")}" style="cursor:pointer;font-size:11px;border:1px solid ${col[s.function]}66;color:${col[s.function]};background:${col[s.function]}14;border-radius:6px;padding:4px 10px">${s.roman} · <strong>${s.chord}</strong> <span style="opacity:.7">${s.function}</span></span>`).join("");
    panel.querySelectorAll(".h-snext").forEach((b) => b.onclick = () => { const o = [...panel.querySelector("#h-scur").options].find((x) => x.value.toLowerCase() === b.dataset.r.toLowerCase()); if (o) panel.querySelector("#h-scur").value = o.value; suggest(); });
  }
  // C · expressive
  function chordsToNotes(chords, barsPer) { const notes = []; chords.forEach((c, ci) => (c.tones || []).forEach((p) => notes.push({ pitch: p, start: ci * barsPer * 4, dur: barsPer * 4 * 0.95 }))); return notes; }
  async function genExpressive() {
    const args = { key: panel.querySelector("#h-ekey").value, scale: panel.querySelector("#h-escale").value, degrees: panel.querySelector("#h-edeg").value, spread: panel.querySelector("#h-espread").value, complexity: panel.querySelector("#h-ecomp").value, inversions: +panel.querySelector("#h-einv").value, human_feel: +panel.querySelector("#h-ehf").value, bass_root: panel.querySelector("#h-ebass").checked, top_line: panel.querySelector("#h-etop").checked, arp: panel.querySelector("#h-earp").checked, arp_rate: panel.querySelector("#h-earate").value };
    const r = await exec("generate_expressive", args);
    if (!r.success) { const demo = [{ tones: [48,51,55,58] }, { tones: [56,59,63,46] }, { tones: [51,55,58,62] }]; panel.querySelector("#h-eroll").innerHTML = roll(chordsToNotes(demo, 1), 12, "#c792ea"); panel.querySelector("#h-einfo").textContent = "Demo (offline)"; return; }
    panel.querySelector("#h-einfo").textContent = `${r.data.chords.length} chords · ${r.data.noteCount} notes${r.data.arp ? " · arp" : ""} → ${r.data.clipName}`;
    panel.querySelector("#h-eroll").innerHTML = roll(chordsToNotes(r.data.chords, 1), Math.max(4, r.data.chords.length * 4), "#c792ea");
  }
  // D · arp engine (lives in miditransform)
  async function genArp() {
    const args = { root: panel.querySelector("#h-aroot").value, chord: panel.querySelector("#h-achord").value, bars: +panel.querySelector("#h-abars").value, pattern: panel.querySelector("#h-apat").value, rate: panel.querySelector("#h-arate").value, octaves: +panel.querySelector("#h-aoct").value, variations: +panel.querySelector("#h-avar").value };
    const r = await api.post("/api/execute", { name: "miditransform__generate_arp", args });
    let arps;
    if (r.success) { arps = r.data.arps; panel.querySelector("#h-ainfo").textContent = `${arps.length} variations of ${args.root}${args.chord}`; }
    else { panel.querySelector("#h-ainfo").textContent = "Demo (offline)"; const base = 48, t = [base, base + 3, base + 7, base + 10]; arps = ["up", "down", "updown"].map((p, vi) => { const ord = vi === 1 ? [...t].reverse() : t; const ns = []; for (let i = 0, x = 0; x < 8; x += 0.25, i++) ns.push({ pitch: ord[i % ord.length] + (i % 8 >= 4 ? 12 : 0), start: x, dur: 0.22 }); return { variation: vi + 1, pattern: p, rate: "1/16", octaves: 2, noteCount: ns.length, notes: ns }; }); }
    const span = (+panel.querySelector("#h-abars").value) * 4;
    panel.querySelector("#h-agrid").innerHTML = arps.map((a) => `<div style="border:1px solid #2f2f36;border-radius:8px;padding:7px"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:11px;color:#e8e8ea">${a.pattern} · ${a.rate}</span><span class="hint" style="font-size:10px">×${a.octaves} · ${a.noteCount}n</span></div>${roll(a.notes.map((n) => ({ pitch: n.pitch, start: n.start, dur: n.dur })), span, "#6cc6ff", 7)}</div>`).join("");
  }

  panel.querySelector("#h-detect").onclick = detect;
  panel.querySelector("#h-suggest").onclick = suggest;
  panel.querySelector("#h-egen").onclick = genExpressive;
  panel.querySelector("#h-agen").onclick = genArp;
  suggest(); genExpressive(); genArp();
};
