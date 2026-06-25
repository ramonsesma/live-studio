// Rich panel: Audio → MIDI Melody — render a monophonic audio part and transcribe it to a new
// MIDI clip via the bridge (/api/audio2midi). Demo asks the bridge for an offline transcription.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.audio2midi = function (panel, helpers) {
  const api = helpers.api;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  panel.innerHTML = `
    <div class="panel-head"><h1>🎤 Audio → MIDI Melody</h1><p>Renders a <strong>monophonic</strong> audio part (vocal, bass, lead) and transcribes it to a new MIDI clip using an in-host YIN pitch tracker. One note at a time — not polyphonic.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="am-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Start</label><input id="am-start" type="number" value="0" style="width:56px" />
      <label class="hint">End</label><input id="am-end" type="number" value="8" style="width:56px" />
      <label class="hint">Noise floor</label><input id="am-nf" type="number" value="0.012" step="0.002" style="width:64px" />
      <label class="hint">Min note (ms)</label><input id="am-md" type="number" value="60" style="width:56px" />
      <button class="btn" id="am-go"><i class="ti ti-wand" aria-hidden="true"></i> Transcribe</button>
      <button class="btn ghost" id="am-demo">Demo</button>
      <span class="hint" id="am-info"></span>
    </div>
    <div id="am-roll" style="margin-top:12px"></div>`;

  function roll(notes) {
    if (!notes.length) return `<div class="hint" style="padding:10px">No pitched notes detected — try lowering the noise floor.</div>`;
    const ps = notes.map((n) => n.pitch), lo = Math.min(...ps) - 1, hi = Math.max(...ps) + 1, range = Math.max(1, hi - lo);
    const span = Math.max(...notes.map((n) => n.start + n.dur)), W = 640, rowH = 12, H = range * rowH + 10;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px">`;
    for (let p = lo; p <= hi; p++) { const y = ((hi - p) * rowH) + 5, black = [1,3,6,8,10].includes(((p % 12) + 12) % 12); r += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="${black ? "#17171e" : "#15151b"}" />`; if (((p % 12) + 12) % 12 === 0) r += `<text x="3" y="${y + 9}" fill="#5b5b63" font-size="8">C${Math.floor(p / 12) - 1}</text>`; }
    for (const n of notes) { const x = (n.start / span) * (W - 6) + 3, w = Math.max(3, (n.dur / span) * (W - 6) - 1), y = ((hi - n.pitch) * rowH) + 6; r += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rowH - 2}" rx="2" fill="#4ea1ff" opacity="${(0.4 + (n.vel / 127) * 0.6).toFixed(2)}"><title>${NN[((n.pitch % 12) + 12) % 12]}${Math.floor(n.pitch / 12) - 1} · vel ${n.vel}</title></rect>`; }
    return r + `</svg>`;
  }
  function render(d) { panel.querySelector("#am-info").textContent = `${d.source === "demo" ? "Demo · " : ""}${d.noteCount} notes${d.clipName ? ` → ${d.clipName}` : ""} · ${d.tempo} BPM`; panel.querySelector("#am-roll").innerHTML = roll(d.notes); }

  async function go(demo) {
    panel.querySelector("#am-info").textContent = "Rendering + tracking pitch…";
    const r = await api.post("/api/audio2midi", demo ? { demo: true } : { trackIndex: +panel.querySelector("#am-trk").value, startBeat: +panel.querySelector("#am-start").value, endBeat: +panel.querySelector("#am-end").value, noiseFloor: +panel.querySelector("#am-nf").value, minDurMs: +panel.querySelector("#am-md").value });
    if (r.success) render(r.data); else { panel.querySelector("#am-info").textContent = r.error || "Failed"; go(true); }
  }
  panel.querySelector("#am-go").onclick = () => go(false);
  panel.querySelector("#am-demo").onclick = () => go(true);
  go(true);
};
