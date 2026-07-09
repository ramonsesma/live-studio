// Rich panel: Strip Silence — visualizes the clip's REAL RMS-measured silence map (sound vs.
// silence regions) as a timeline before committing to a trim/split, so the ms numbers in the
// autoform's analyze_silence output aren't the only feedback.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.stripsilence = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>✂️ Strip Silence</h1><p>Maps a clip's real silence from its measured RMS envelope, then trims the ends or splits per sound region.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="ss-trk" type="number" value="0" />
      <label class="hint">Clip</label><input id="ss-clip" type="number" value="0" />
      <label class="hint">Threshold dB</label><input id="ss-th" type="number" value="-48" step="1" style="width:70px" />
      <label class="hint">Min silence ms</label><input id="ss-min" type="number" value="120" step="10" style="width:80px" />
      <button class="btn" id="ss-go">Analyze</button>
      <span class="hint" id="ss-info">set track/clip and Analyze</span>
    </div>
    <div id="ss-map" style="margin-top:14px"></div>
    <div id="ss-actions" style="display:none;margin-top:12px;gap:8px;align-items:center;flex-wrap:wrap" class="ss-toolbar">
      <label class="hint">Fade ms</label><input id="ss-fade" type="number" value="5" style="width:60px" />
      <button class="btn" id="ss-trim">Trim lead/tail</button>
      <button class="btn ghost" id="ss-split">Split into regions</button>
      <span class="hint" id="ss-result"></span>
    </div>`;

  let last = null;

  function args() {
    return { trackIndex: Number(panel.querySelector("#ss-trk").value), clipIndex: Number(panel.querySelector("#ss-clip").value), threshold_db: Number(panel.querySelector("#ss-th").value), min_silence_ms: Number(panel.querySelector("#ss-min").value) };
  }

  function drawMap(d) {
    const dur = d.durSec || 1;
    const lead = d.leadSilenceSec || 0, tail = d.tailSilenceSec || 0;
    const bars = [];
    let cursor = 0;
    if (lead > 0.001) { bars.push({ t: "silence", w: lead }); cursor = lead; }
    for (const r of d.soundRegions || []) {
      if (r.start > cursor + 0.001) bars.push({ t: "silence", w: r.start - cursor });
      bars.push({ t: "sound", w: r.end - r.start, label: `${r.start.toFixed(2)}–${r.end.toFixed(2)}s` });
      cursor = r.end;
    }
    if (tail > 0.001) bars.push({ t: "silence", w: tail });
    panel.querySelector("#ss-map").innerHTML = `
      <div class="hint" style="margin-bottom:6px">${d.source} · ${dur}s · threshold ${d.thresholdDb} dB · lead ${lead.toFixed(2)}s · tail ${tail.toFixed(2)}s · ${(d.soundRegions || []).length} sound region(s)</div>
      <div style="display:flex;height:44px;border:1px solid var(--line);border-radius:6px;overflow:hidden">
        ${bars.map((b) => `<div title="${b.label || "silence"}" style="flex:${Math.max(b.w, 0.02)};background:${b.t === "sound" ? "linear-gradient(180deg,#5ad17a,#3a9a58)" : "repeating-linear-gradient(45deg,#26262c,#26262c 4px,#1c1c20 4px,#1c1c20 8px)"};border-right:1px solid var(--bg)"></div>`).join("")}
      </div>`;
  }

  async function go() {
    panel.querySelector("#ss-info").textContent = "analyzing…";
    const r = await exec("analyze_silence", args());
    if (!r.success) { panel.querySelector("#ss-info").textContent = r.error; panel.querySelector("#ss-actions").style.display = "none"; return; }
    last = r.data;
    panel.querySelector("#ss-info").textContent = "✓ analyzed";
    drawMap(last);
    panel.querySelector("#ss-actions").style.display = "flex";
    panel.querySelector("#ss-result").textContent = "";
  }

  panel.querySelector("#ss-go").onclick = go;

  panel.querySelector("#ss-trim").onclick = async () => {
    panel.querySelector("#ss-result").textContent = "trimming…";
    const r = await exec("trim_silence", { ...args(), mode: "lead_tail", fade_ms: Number(panel.querySelector("#ss-fade").value) });
    panel.querySelector("#ss-result").textContent = r.success ? `✓ trimmed ${r.data.trimmedSec}s → new clip imported` : r.error;
  };
  panel.querySelector("#ss-split").onclick = async () => {
    panel.querySelector("#ss-result").textContent = "splitting…";
    const r = await exec("trim_silence", { ...args(), mode: "split", fade_ms: Number(panel.querySelector("#ss-fade").value) });
    panel.querySelector("#ss-result").textContent = r.success ? `✓ wrote ${r.data.segments} region file(s), imported` : r.error;
  };
};
