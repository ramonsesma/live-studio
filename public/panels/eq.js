// Rich panel: EQ & Analysis — frequency profile + EQ suggestions.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.eq = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎚️ EQ & Analysis</h1><p>Spectral profile by bands and EQ suggestions.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="eq-track" type="number" value="0" style="width:80px" />
      <button class="btn" id="eq-go">Analyze</button>
      <label class="hint">Preset</label>
      <select id="eq-preset"><option>clean</option><option>warm</option><option>bright</option><option>bass_cut</option><option>treble_boost</option><option>smile</option></select>
      <button class="btn ghost" id="eq-apply">Apply preset</button>
    </div>
    <div id="eq-bands" class="eq-bands"><span class="hint">Click "Analyze".</span></div>
    <h3 style="margin-top:14px">Suggestions</h3>
    <ul id="eq-sugg" class="org-list"><li class="hint">—</li></ul>
    <div class="result" id="eq-out" style="display:none"></div>`;

  const out = panel.querySelector("#eq-out");
  function show(r){ out.style.display="block"; out.className="result "+(r.success?"ok":"err"); out.textContent=JSON.stringify(r.data||r,null,2); }
  const trackIdx = () => Number(panel.querySelector("#eq-track").value) || 0;

  async function go() {
    const an = await exec("analyze_track_frequency", { track_index: trackIdx() });
    const box = panel.querySelector("#eq-bands");
    box.innerHTML = "";
    if (!an.success) { box.innerHTML = `<span class="hint">${an.error}</span>`; return; }
    const fp = an.data.frequencyProfile;
    for (const [key, b] of Object.entries(fp)) {
      const col = document.createElement("div");
      col.className = "eq-band";
      const h = Math.round((b.level || 0) * 100);
      col.innerHTML = `<div class="eq-bar-wrap"><div class="eq-bar" style="height:${Math.max(3,h)}%"></div></div><span class="hint">${b.range}</span>`;
      col.title = `${key}: ${(b.level*100).toFixed(0)}%`;
      box.appendChild(col);
    }
    const sg = await exec("suggest_eq", { track_index: trackIdx() });
    const ul = panel.querySelector("#eq-sugg");
    ul.innerHTML = "";
    if (sg.success) for (const s of sg.data.suggestions) {
      const li = document.createElement("li");
      li.textContent = `${s.band} @ ${s.freq}Hz · ${s.gain > 0 ? '+' : ''}${s.gain}dB (Q${s.q}) — ${s.reason}`;
      ul.appendChild(li);
    }
  }
  panel.querySelector("#eq-go").onclick = go;
  panel.querySelector("#eq-apply").onclick = async () => show(await exec("apply_eq_preset", { track_index: trackIdx(), preset: panel.querySelector("#eq-preset").value }));
  go();
};
