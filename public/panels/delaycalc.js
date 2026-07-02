// Rich panel: Delay Calculator — visual table of note-value → ms at the real project tempo.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.delaycalc = function (panel, helpers) {
  const exec = helpers.execute;
  const NOTES = ["1/1","1/2","1/2d","1/4","1/4d","1/4t","1/8","1/8d","1/8t","1/16","1/16d","1/16t","1/32"];
  panel.innerHTML = `
    <div class="panel-head"><h1>⏱️ Delay Calculator</h1><p>Real delay/reverb times for every note value at the project's actual tempo.</p></div>
    <div class="ss-toolbar">
      <label class="hint">BPM (blank = project tempo)</label><input id="dc-bpm" type="number" style="width:80px" />
      <button class="btn" id="dc-calc">Calculate</button>
      <span class="hint" id="dc-info"></span>
    </div>
    <div id="dc-table" style="margin-top:10px"></div>
    <div class="ss-toolbar" style="margin-top:14px">
      <label class="hint">Apply to track</label><input id="dc-track" type="number" value="0" style="width:70px" />
      <select id="dc-note">${["1/4","1/4d","1/8","1/8d","1/8t","1/16","1/16d","1/16t"].map((n) => `<option>${n}</option>`).join("")}</select>
      <button class="btn ghost" id="dc-apply">Apply to Delay device</button>
    </div>`;

  async function calc() {
    const bpm = panel.querySelector("#dc-bpm").value;
    const r = await exec("calculate", bpm ? { bpm: Number(bpm) } : {});
    if (!r.success) { panel.querySelector("#dc-table").innerHTML = `<span class="hint">${r.error}</span>`; return; }
    panel.querySelector("#dc-info").textContent = `${r.data.bpm} BPM`;
    const times = r.data.allTimes;
    panel.querySelector("#dc-table").innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">` +
      NOTES.filter((n) => times[n] != null).map((n) => `
        <div style="border:1px solid #2f2f36;border-radius:7px;padding:8px 10px;background:#13131a;text-align:center">
          <div class="hint" style="font-size:11px">${n}</div>
          <div style="color:#6cc6ff;font-size:16px;font-weight:600">${times[n]} ms</div>
        </div>`).join("") + `</div>`;
  }
  panel.querySelector("#dc-calc").onclick = calc;
  panel.querySelector("#dc-apply").onclick = async () => {
    const r = await exec("apply_delay", { track_index: Number(panel.querySelector("#dc-track").value)||0, note_value: panel.querySelector("#dc-note").value });
    panel.querySelector("#dc-info").textContent = r.success ? `${r.data.delayMs}ms on "${r.data.trackName}"${r.data.deviceSet ? "" : " (device param not found — " + (r.data.hint||"") + ")"}` : r.error;
  };
  calc();
};
