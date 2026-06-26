// Rich panel: Song Map — drop a genre song-structure template as named locators (cue points),
// see the whole arrangement as colored sections on a timeline, and manage/clear locators.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.arrangement = function (panel, helpers) {
  const exec = helpers.execute;
  const SECTION_COL = { intro: "#82c98a", build: "#e0a23a", drop: "#e8617a", break: "#6cc6ff", breakdown: "#6cc6ff", verse: "#b58ce0", chorus: "#e8617a", hook: "#e8617a", pre: "#e0a23a", bridge: "#9d8cff", groove: "#82c98a", swell: "#57c7e0", theme: "#b58ce0", shift: "#e0a23a", climax: "#e8617a", resolve: "#57c7e0", switch: "#e0a23a", outro: "#9a9aa3" };
  const colOf = (name) => { const k = String(name).toLowerCase().replace(/\s*\d+$/, ""); return SECTION_COL[k] || "#9a9aa3"; };

  panel.innerHTML = `
    <div class="panel-head"><h1>🎬 Song Map</h1><p>Drop a genre song-structure template into the arrangement as named locators, see it on a timeline, and manage the markers.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Template</label><select id="ar-tpl"><option value="edm">EDM</option><option value="hiphop">Hip-Hop</option><option value="poprock">Pop/Rock</option><option value="ambient">Ambient/Cinematic</option><option value="funk">Funk/Soul</option><option value="breaks">Breaks/Bass</option></select>
      <label class="hint">Bars ×</label><input id="ar-scale" type="number" value="1" step="0.5" style="width:54px" />
      <label class="hint">Tempo</label><input id="ar-tempo" type="number" placeholder="—" style="width:60px" />
      <label class="hint"><input type="checkbox" id="ar-clear" checked /> clear first</label>
      <button class="btn" id="ar-apply"><i class="ti ti-map-pin" aria-hidden="true"></i> Apply template</button>
      <button class="btn ghost" id="ar-refresh"><i class="ti ti-refresh" aria-hidden="true"></i> Refresh</button>
      <button class="btn ghost" id="ar-clearall"><i class="ti ti-trash" aria-hidden="true"></i> Clear all</button>
      <span class="hint" id="ar-info"></span>
    </div>
    <div id="ar-timeline" style="margin-top:12px"></div>`;

  function timeline(markers) {
    if (!markers.length) return `<div class="hint" style="padding:10px">No locators. Pick a template and Apply.</div>`;
    const W = 660, H = 76;
    const totalBeats = Math.max(markers[markers.length - 1].time + 16, 16);
    const span = markers.length > 1 ? (markers[markers.length - 1].time - markers[0].time) + (markers[markers.length - 1].time - markers[markers.length - 2].time || 16) : totalBeats;
    const base = markers[0].time;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px">`;
    markers.forEach((m, i) => {
      const next = i + 1 < markers.length ? markers[i + 1].time : m.time + (markers[1] ? markers[1].time - markers[0].time : 16);
      const x = ((m.time - base) / span) * (W - 8) + 4, w = Math.max(8, ((next - m.time) / span) * (W - 8) - 2), col = colOf(m.name);
      r += `<rect x="${x.toFixed(1)}" y="22" width="${w.toFixed(1)}" height="34" rx="4" fill="${col}" opacity="0.82"><title>${m.name} · bar ${Math.round(m.time / 4) + 1}</title></rect>`;
      r += `<text x="${(x + 4).toFixed(1)}" y="43" fill="#0c0c10" font-size="10" font-weight="500">${m.name}</text>`;
      r += `<text x="${(x + 4).toFixed(1)}" y="68" fill="#6b6b73" font-size="8">${Math.round(m.time / 4) + 1}</text>`;
    });
    return r + `</svg>`;
  }
  async function refresh() {
    const r = await exec("get_markers", {});
    if (r.success && r.data.markers.length) { panel.querySelector("#ar-timeline").innerHTML = timeline(r.data.markers); panel.querySelector("#ar-info").textContent = `${r.data.markerCount} locators`; }
    else demo();
  }
  async function apply() {
    const args = { genre: panel.querySelector("#ar-tpl").value, bars_scale: +panel.querySelector("#ar-scale").value, clear_first: panel.querySelector("#ar-clear").checked };
    const tempo = panel.querySelector("#ar-tempo").value; if (tempo) args.set_tempo = +tempo;
    const r = await exec("apply_cue_template", args);
    if (r.success) { panel.querySelector("#ar-info").textContent = `${r.data.genre}: ${r.data.sections} locators · ${r.data.totalBars} bars${r.data.tempo ? " · " + r.data.tempo + " BPM" : ""}`; panel.querySelector("#ar-timeline").innerHTML = timeline(r.data.markers); }
    else demo();
  }
  async function clearAll() {
    const r = await exec("clear_markers", {});
    panel.querySelector("#ar-info").textContent = r.success ? `Cleared ${r.data.removed} locators` : (r.error || "Open a Set in Live");
    refresh();
  }
  function demo() {
    const tpls = { edm: [["Intro",16],["Build",8],["Drop",16],["Breakdown",16],["Build 2",8],["Drop 2",16],["Outro",16]], hiphop: [["Intro",4],["Verse 1",16],["Hook",8],["Verse 2",16],["Hook 2",8],["Bridge",8],["Hook 3",8],["Outro",4]], poprock: [["Intro",4],["Verse 1",8],["Pre",4],["Chorus",8],["Verse 2",8],["Pre 2",4],["Chorus 2",8],["Bridge",8],["Chorus 3",8],["Outro",4]], ambient: [["Intro",16],["Swell",16],["Theme",32],["Shift",16],["Climax",16],["Resolve",16]], funk: [["Intro",8],["Groove",16],["Verse",16],["Chorus",8],["Break",8],["Verse 2",16],["Chorus 2",8],["Outro",8]], breaks: [["Intro",16],["Drop",32],["Switch",16],["Drop 2",32],["Outro",16]] };
    const t = tpls[panel.querySelector("#ar-tpl").value] || tpls.edm;
    let bar = 0; const markers = t.map(([name, bars]) => { const m = { name, time: bar * 4 }; bar += bars; return m; });
    panel.querySelector("#ar-timeline").innerHTML = timeline(markers); panel.querySelector("#ar-info").textContent = "Demo (offline) — preview of the song map";
  }
  panel.querySelector("#ar-apply").onclick = apply;
  panel.querySelector("#ar-refresh").onclick = refresh;
  panel.querySelector("#ar-clearall").onclick = clearAll;
  panel.querySelector("#ar-tpl").onchange = demo;
  demo();
};
