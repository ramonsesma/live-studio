// Rich panel: Instrument Render — pick any MIDI clip, pick an engine, render it as audio.
// This is the bridge between our engines and every MIDI-producing module.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.instrumentrender = function (panel, helpers) {
  const api = helpers.api;
  const ENGINES = [["pluck","🎸 Pluck"],["pad","🌫️ Pad"],["bell","🔔 FM Bell"],["organ","🎛️ Organ"],["stab","🎹 Chord Stab"],["subbass","🔈 Sub Bass"],["sub808","🔊 808"],["vocalchop","🗣️ Vocal Chop"],["drumsynth","🥁 Drum Synth"],["brass","🎺 Brass"],["choir","👥 Choir"],["pluckbass","🎸 Pluck Bass"],["sawlead","⚡ Saw Lead"],["reese","🐅 Reese Bass"],["marimba","🪵 Marimba"],["trumpet","🎺 Trumpet"],["epiano","🎹 E-Piano"],["musicbox","🎼 Music Box"],["harp","🪕 Harp"],["whistle","😗 Whistle"],["guitar","🎸 Guitar"],["sitar","🪘 Sitar"],["steeldrum","🛢️ Steel Drum"],["accordion","🪗 Accordion"],["theremin","👻 Theremin"],["glassbell","💎 Glass Bell"]];
  let lastAudio = null;

  panel.innerHTML = `
    <div class="panel-head"><h1>🎚️ Instrument Render</h1><p>Render <strong>any MIDI clip</strong> through any of our in-host engines into a new audio clip — the bridge between chords/melody/bass/drums/pattern generators and our synths.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="ir-trk" type="number" value="0" style="width:46px" />
      <label class="hint">Clip</label><input id="ir-clip" type="number" value="0" style="width:46px" />
      <label class="hint">Engine</label><select id="ir-eng">${ENGINES.map(([v, l]) => `<option value="${v}"${v === "pluck" ? " selected" : ""}>${l}</option>`).join("")}</select>
      <button class="btn" id="ir-go"><i class="ti ti-wand" aria-hidden="true"></i> Render &amp; import</button>
      <button class="btn ghost" id="ir-demo">Demo</button>
      <button class="btn ghost" id="ir-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button>
      <span class="hint" id="ir-info"></span>
    </div>
    <div style="margin-top:10px;padding:10px 12px;background:#101015;border:1px solid #2a2a32;border-radius:8px;font-size:11px;color:#9a9aa3">
      <span style="color:#c4a4e8">Try</span> generating a clip with <code style="color:#cbb6ea">harmonizer · generate_expressive</code>, <code style="color:#cbb6ea">bassengine · generate</code>, <code style="color:#cbb6ea">patternlang · compile</code> or <code style="color:#cbb6ea">genrhythm · generate</code>, then render it here with any engine.
    </div>
    <div id="ir-wave" style="margin-top:12px"></div>
    <audio id="ir-audio" style="display:none"></audio>`;

  function wave(peaks, engine) {
    if (!peaks || !peaks.length) return "";
    const W = 660, H = 90, mid = H / 2, bw = (W - 4) / peaks.length;
    const col = ({ pad: "#9d8cff", pluck: "#5ec4a8", bell: "#57c7e0", organ: "#6cc6ff", stab: "#b58ce0", subbass: "#e0a23a", sub808: "#e0a23a", vocalchop: "#d4537e", drumsynth: "#e8617a", brass: "#e89a3a", choir: "#bc8df0", pluckbass: "#5ec4a8", sawlead: "#f0a04b", reese: "#a04bff", marimba: "#c79568", trumpet: "#e89a3a", epiano: "#74c4e0", musicbox: "#f0c068", harp: "#79c5b0", whistle: "#a4d4ea", guitar: "#e8617a", sitar: "#c78d5e", steeldrum: "#8dd0d8", accordion: "#e0985e", theremin: "#9a8cd8", glassbell: "#a8e0e8" })[engine] || "#74b8e0";
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`;
    peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="${col}" opacity="0.85"/>`; });
    return r + `</svg>`;
  }
  async function render(demo) {
    panel.querySelector("#ir-info").textContent = "Rendering…";
    const body = demo ? { demo: true, engine: panel.querySelector("#ir-eng").value } : { trackIndex: +panel.querySelector("#ir-trk").value, clipIndex: +panel.querySelector("#ir-clip").value, engine: panel.querySelector("#ir-eng").value };
    const r = await api.post("/api/render", body);
    if (!r.success) { if (!demo) return render(true); panel.querySelector("#ir-info").textContent = r.error || "Failed"; return; }
    lastAudio = r.data.audio;
    panel.querySelector("#ir-wave").innerHTML = wave(r.data.wave, r.data.engine);
    panel.querySelector("#ir-info").textContent = `${r.data.source === "demo" ? "Demo · " : ""}${r.data.engine} · ${r.data.noteCount} notes · ${r.data.durSec}s${r.data.importedPath ? " · imported" : ""}`;
  }
  async function audition() { if (!lastAudio) await render(true); if (!lastAudio) return; const a = panel.querySelector("#ir-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {}); }
  panel.querySelector("#ir-go").onclick = () => render(false);
  panel.querySelector("#ir-demo").onclick = () => render(true);
  panel.querySelector("#ir-aud").onclick = audition;
  render(true);
};
