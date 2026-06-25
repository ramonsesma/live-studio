// Rich panel: Loop Length Detective — estimate a loop's BPM and suggest a global song tempo.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.loopdetect = function (panel, helpers) {
  const api = helpers.api;
  const detect = (body) => api.post("/api/loopdetect", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>🔍 Loop Length Detective</h1><p>Estimates a loop's BPM from its audio and suggests a global song tempo to make it fit.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="ld-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Clip</label><input id="ld-clip" type="number" value="0" style="width:50px" />
      <button class="btn" id="ld-go"><i class="ti ti-wave-sine" aria-hidden="true"></i> Detect</button>
      <span class="hint" id="ld-info">Press Detect (decodes/renders the clip) or shows Demo.</span>
    </div>
    <div id="ld-out"></div>`;

  function render(d) {
    panel.querySelector("#ld-info").textContent = `${d.clipName} · ${d.durationSec}s · current ${d.currentTempo ?? "?"} BPM`;
    panel.querySelector("#ld-out").innerHTML = `
      <div style="display:flex;gap:18px;align-items:center;margin:10px 0">
        <div style="text-align:center"><div class="hint" style="font-size:11px">detected</div><div style="color:#ffb347;font-size:30px;font-weight:600">${d.detectedBpm ?? "—"}</div><div class="hint" style="font-size:11px">BPM</div></div>
        <div style="flex:1">
          <div style="font-size:12px;color:#9a9aa2;margin-bottom:6px">Bar-fit candidates (assuming whole 4/4 bars):</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${(d.candidates || []).map((c) => `<button class="btn ghost ld-apply" data-bpm="${c.bpm}" style="padding:5px 10px"><b>${c.bpm}</b> BPM <span class="hint">· ${c.bars} ${c.bars === 1 ? "bar" : "bars"}</span></button>`).join("") || '<span class="hint">no sane bar-fit found</span>'}
          </div>
          <div class="hint" style="font-size:11px;margin-top:6px">No tempo map (the SDK has none) — these set the global <code>song.tempo</code>.</div>
        </div>
      </div>`;
    panel.querySelectorAll(".ld-apply").forEach((b) => { b.onclick = async () => { const r = await detect({ trackIndex: Number(panel.querySelector("#ld-trk").value), clipIndex: Number(panel.querySelector("#ld-clip").value), applyTempo: Number(b.dataset.bpm) }); panel.querySelector("#ld-info").textContent = r.success && r.data.applied ? `Set song tempo to ${r.data.appliedTempo} BPM` : (r.error || "set"); }; });
  }

  async function go(demo) {
    const r = await detect({ demo: !!demo, trackIndex: Number(panel.querySelector("#ld-trk").value), clipIndex: Number(panel.querySelector("#ld-clip").value) });
    if (r.success) render(r.data);
    else { panel.querySelector("#ld-info").textContent = r.error + " — showing Demo."; go(true); }
  }
  panel.querySelector("#ld-go").onclick = () => go(false);
  go(true);
};
