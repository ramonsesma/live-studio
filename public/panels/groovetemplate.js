// Rich panel: Groove Template Extractor — visualize a clip's micro-timing and apply it to
// another clip. Demo shows a swung 16-step groove.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.groovetemplate = function (panel, helpers) {
  const exec = helpers.execute;
  const api = helpers.api;

  panel.innerHTML = `
    <div class="panel-head"><h1>🫀 Groove Template Extractor</h1><p>Reads a clip's micro-timing groove and applies it to another clip — the .agr-free way to move a feel.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Source</label><input id="gt-strk" type="number" value="0" style="width:46px" /><input id="gt-sclip" type="number" value="0" style="width:46px" />
      <button class="btn" id="gt-ext"><i class="ti ti-activity" aria-hidden="true"></i> Extract</button>
      <span class="hint" id="gt-info"></span>
    </div>
    <div id="gt-viz"></div>
    <div class="ss-toolbar" style="margin-top:10px">
      <label class="hint">Apply to</label><input id="gt-ttrk" type="number" value="1" style="width:46px" /><input id="gt-tclip" type="number" value="0" style="width:46px" />
      <label class="hint">Strength</label><input id="gt-str" type="range" min="0" max="100" value="100" /><span class="hint" id="gt-strv">100%</span>
      <label class="hint"><input id="gt-vel" type="checkbox" /> velocity feel</label>
      <label class="hint" title="Pitches kept out of the pocket (stay straight/human)">Lock</label><input id="gt-excl" type="text" value="36" placeholder="36,38" style="width:60px" />
      <button class="btn ghost" id="gt-apply">Apply groove</button>
    </div>
    <div class="ss-toolbar" style="margin-top:10px">
      <label class="hint" title="Per-element velocity range → native velocityDeviation">Lane dynamics</label>
      <input id="gt-lanes" type="text" value="36:96-104,38:90-110,42:55-95:18" style="width:240px" />
      <button class="btn ghost" id="gt-dyn"><i class="ti ti-adjustments" aria-hidden="true"></i> Set dynamics</button>
      <span class="hint" id="gt-dyninfo">pitch:min-max[:dev] per drum element</span>
    </div>
    <div class="ss-toolbar" style="margin-top:10px">
      <label class="hint" title="Extract groove from an audio loop's transients">From audio</label>
      <label class="hint">Src track</label><input id="gt-atrk" type="number" value="0" style="width:46px" />
      <button class="btn ghost" id="gt-audio"><i class="ti ti-waveform" aria-hidden="true"></i> Extract from audio → apply</button>
      <span class="hint" id="gt-audioinfo">renders the loop, detects onsets, grooves the target clip</span>
    </div>`;

  function viz(steps, swingMs) {
    const W = 700, H = 130, mid = 70, cw = (W - 20) / 16, scale = 2.2;
    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #38383f;border-radius:8px">
      <line x1="10" y1="${mid}" x2="${W - 10}" y2="${mid}" stroke="#34343b" stroke-dasharray="3 3" />
      <text x="12" y="${mid - 6}" fill="#5c5c66" font-size="9">grid</text>`;
    steps.forEach((s, i) => {
      const x = 10 + i * cw + cw / 2, off = Math.max(-50, Math.min(50, s.offsetMs)) * scale;
      const has = s.count > 0;
      svg += `<line x1="${x}" y1="${mid - 50}" x2="${x}" y2="${mid + 50}" stroke="${i % 4 === 0 ? "#2a2a32" : "#1e1e26"}" />`;
      if (has) { svg += `<line x1="${x}" y1="${mid}" x2="${x}" y2="${mid + off}" stroke="${off > 0 ? "#e24b4a" : "#5ad17a"}" stroke-width="3" /><circle cx="${x}" cy="${mid + off}" r="3.5" fill="${off > 0 ? "#e24b4a" : "#5ad17a"}" />`; }
      svg += `<text x="${x}" y="${H - 4}" fill="#5c5c66" font-size="8" text-anchor="middle">${i + 1}</text>`;
    });
    svg += `</svg><div class="hint" style="font-size:11px;margin-top:4px"><span style="color:#5ad17a">▲</span> early · <span style="color:#e24b4a">▼</span> late · swing ${swingMs > 0 ? "+" : ""}${swingMs} ms</div>`;
    panel.querySelector("#gt-viz").innerHTML = svg;
  }

  function demo() {
    const steps = Array.from({ length: 16 }, (_, i) => ({ step: i, count: i % 2 === 0 ? 4 : 2, offsetMs: i % 2 === 1 ? 18 + Math.round(Math.random() * 6) : Math.round((Math.random() - 0.5) * 6) }));
    viz(steps, 20); panel.querySelector("#gt-info").textContent = "Demo — a swung 16th groove (off-beats ~+20ms late)";
  }

  async function extract() {
    const r = await exec("extract_template", { track_index: Number(panel.querySelector("#gt-strk").value), clip_index: Number(panel.querySelector("#gt-sclip").value) });
    if (r.success) { viz(r.data.steps, r.data.swingMs); panel.querySelector("#gt-info").textContent = `${r.data.clipName} · swing ${r.data.swingMs > 0 ? "+" : ""}${r.data.swingMs}ms`; }
    else demo();
  }
  panel.querySelector("#gt-str").oninput = (e) => (panel.querySelector("#gt-strv").textContent = e.target.value + "%");
  panel.querySelector("#gt-ext").onclick = extract;
  panel.querySelector("#gt-apply").onclick = async () => {
    const r = await exec("apply_template", { target_track: Number(panel.querySelector("#gt-ttrk").value), target_clip: Number(panel.querySelector("#gt-tclip").value), source_track: Number(panel.querySelector("#gt-strk").value), source_clip: Number(panel.querySelector("#gt-sclip").value), strength: Number(panel.querySelector("#gt-str").value), apply_velocity: panel.querySelector("#gt-vel").checked, exclude_pitches: panel.querySelector("#gt-excl").value });
    panel.querySelector("#gt-info").textContent = r.success ? `Applied groove to ${r.data.targetClip}: nudged ${r.data.notesMoved}/${r.data.notesTotal}${r.data.notesLocked ? ` · ${r.data.notesLocked} locked out of pocket` : ""}` : r.error;
  };
  panel.querySelector("#gt-dyn").onclick = async () => {
    const r = await exec("set_lane_dynamics", { track_index: Number(panel.querySelector("#gt-ttrk").value), clip_index: Number(panel.querySelector("#gt-tclip").value), lanes: panel.querySelector("#gt-lanes").value });
    panel.querySelector("#gt-dyninfo").textContent = r.success ? `${r.data.affected} notes · ${r.data.lanes.map((l) => `${l.pitch}±${l.deviation}`).join(", ")}` : (r.error || "Open a drum clip in Live");
  };
  panel.querySelector("#gt-audio").onclick = async () => {
    const r = await api.post("/api/groovefromaudio", { sourceTrack: Number(panel.querySelector("#gt-atrk").value), targetTrack: Number(panel.querySelector("#gt-ttrk").value), targetClip: Number(panel.querySelector("#gt-tclip").value), strength: Number(panel.querySelector("#gt-str").value), demo: false });
    if (r.success) { viz(r.data.steps, r.data.swingMs); panel.querySelector("#gt-audioinfo").textContent = `${r.data.onsets} onsets · swing ${r.data.swingMs > 0 ? "+" : ""}${r.data.swingMs}ms${r.data.applied ? ` · grooved ${r.data.applied.notesMoved} notes` : ""}`; }
    else { const d = await api.post("/api/groovefromaudio", { demo: true }); if (d.success) viz(d.data.steps, d.data.swingMs); panel.querySelector("#gt-audioinfo").textContent = (r.error || "Demo (offline) — swung loop") + (d.success ? ` · swing +${d.data.swingMs}ms` : ""); }
  };
  extract();
};
