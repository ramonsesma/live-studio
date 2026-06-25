// Rich panel: Range Auto-Transposer — ranks the 25 shifts by in-range fit, one-click apply.
// Demo ranks an offline melody so it previews without Live.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.transposer = function (panel, helpers) {
  const exec = helpers.execute;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const nm = (p) => NN[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1);

  panel.innerHTML = `
    <div class="panel-head"><h1>🎚️ Range Auto-Transposer</h1><p>Tries all 25 semitone shifts (−12…+12) and picks the one that lands the most notes inside a target register — tie-broken by the smallest move.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="tr-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Clip</label><input id="tr-clip" type="number" value="0" style="width:50px" />
      <label class="hint">Low</label><input id="tr-low" type="number" value="48" style="width:56px" />
      <label class="hint">High</label><input id="tr-high" type="number" value="72" style="width:56px" />
      <button class="btn" id="tr-go"><i class="ti ti-arrows-sort" aria-hidden="true"></i> Suggest</button>
      <span class="hint" id="tr-info"></span>
    </div>
    <div id="tr-list" style="margin-top:10px;display:flex;flex-direction:column;gap:5px"></div>`;

  function render(d, demo) {
    panel.querySelector("#tr-info").textContent = demo ? "Demo (offline)" : `${d.noteCount} notes · target ${nm(d.targetRange.low)}–${nm(d.targetRange.high)}`;
    const best = d.best;
    panel.querySelector("#tr-list").innerHTML = d.ranked.map((s) => {
      const pct = Math.round((s.inRange / d.noteCount) * 100), top = s.semitones === best.semitones;
      return `<div style="display:flex;align-items:center;gap:10px;border:1px solid ${top ? "#5ad17a55" : "#2f2f36"};border-radius:7px;padding:7px 10px;background:${top ? "#13211a" : "#13131a"}">
        <span style="width:64px;color:#e8e8ea;font-size:12px">${s.semitones > 0 ? "+" : ""}${s.semitones} st</span>
        <div style="flex:1;height:8px;background:#202028;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${top ? "#5ad17a" : "#4ea1ff"}"></div></div>
        <span class="hint" style="width:120px;text-align:right">${s.inRange}/${d.noteCount} in · ${s.outside} out</span>
        ${top ? `<button class="btn" data-st="${s.semitones}" style="padding:3px 10px">Apply</button>` : `<button class="btn ghost" data-st="${s.semitones}" style="padding:3px 10px">Apply</button>`}
      </div>`;
    }).join("");
    panel.querySelectorAll("[data-st]").forEach((b) => b.onclick = () => apply(+b.dataset.st));
  }
  async function suggest() {
    const r = await exec("suggest", { track_index: +panel.querySelector("#tr-trk").value, clip_index: +panel.querySelector("#tr-clip").value, low: +panel.querySelector("#tr-low").value, high: +panel.querySelector("#tr-high").value });
    if (r.success) render(r.data, false); else demo();
  }
  async function apply(st) {
    const r = await exec("apply", { track_index: +panel.querySelector("#tr-trk").value, clip_index: +panel.querySelector("#tr-clip").value, semitones: st });
    panel.querySelector("#tr-info").textContent = r.success ? `Applied ${st > 0 ? "+" : ""}${st} st to ${r.data.clip}` : (r.error || "Apply failed");
  }
  function demo() {
    const pitches = [76, 79, 83, 88, 72, 67], low = 48, high = 72, score = (s) => { let i = 0, dist = 0; for (const p of pitches) { const v = p + s; if (v >= low && v <= high) i++; else dist += v < low ? low - v : v - high; } return { semitones: s, inRange: i, outside: pitches.length - i, dist }; };
    const ranked = []; for (let s = -12; s <= 12; s++) ranked.push(score(s)); ranked.sort((a, b) => b.inRange - a.inRange || a.dist - b.dist || Math.abs(a.semitones) - Math.abs(b.semitones));
    render({ noteCount: pitches.length, targetRange: { low, high }, best: ranked[0], ranked: ranked.slice(0, 8) }, true);
  }
  panel.querySelector("#tr-go").onclick = suggest;
  demo();
};
