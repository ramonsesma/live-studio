// Rich panel: Stem Aligner — cross-correlates two audio stems to find their time offset and
// shift the target into alignment. Demo proves the detection offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.stemalign = function (panel, helpers) {
  const api = helpers.api;
  const align = (body) => api.post("/api/stemalign", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>🎯 Stem Aligner</h1><p>Finds the time offset between a guide and a target audio stem (cross-correlation) and shifts the target into place.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Guide</label><input id="sa-g" type="number" value="0" style="width:50px" />
      <label class="hint">Target</label><input id="sa-t" type="number" value="1" style="width:50px" />
      <button class="btn" id="sa-detect"><i class="ti ti-arrows-horizontal" aria-hidden="true"></i> Detect offset</button>
      <button class="btn ghost" id="sa-apply">Apply shift</button>
      <span class="hint" id="sa-info">Press Detect (renders both stems) or shows Demo.</span>
    </div>
    <div id="sa-out"></div>`;

  let last = null;

  function render(d, demo) {
    last = d;
    const ms = d.offsetMs, beats = d.offsetBeats, conf = Math.max(0, Math.min(1, d.confidence));
    const dir = ms > 1 ? `${d.targetName} is ${ms} ms LATE` : ms < -1 ? `${d.targetName} is ${-ms} ms EARLY` : "already aligned";
    // three timelines: guide, target (now, shifted by the offset), target (after align)
    const W = 700;
    const xOf = (t) => 40 + (t * (W - 80)) / 2000; // ms → x across a 2 s window
    const rowBars = (y, color, shiftMs) => [0, 500, 1000, 1500].map((t) => `<rect x="${xOf(t + shiftMs)}" y="${y}" width="34" height="20" rx="3" fill="${color}" opacity="0.85" />`).join("");
    const svg = `<svg viewBox="0 0 ${W} 150" style="width:100%;background:#13131a;border:1px solid #38383f;border-radius:8px">
      <text x="40" y="20" fill="#9a9aa2" font-size="12">${d.guideName} · guide</text>${rowBars(26, "#6cc6ff", 0)}
      <text x="40" y="70" fill="#9a9aa2" font-size="12">${d.targetName} · now</text>${rowBars(76, "#e24b4a", ms)}
      <text x="40" y="120" fill="#9a9aa2" font-size="12">${d.targetName} · after align</text>${rowBars(126, "#5ad17a", 0)}
    </svg>`;
    panel.querySelector("#sa-out").innerHTML = `
      <div style="display:flex;gap:18px;align-items:center;margin:10px 0">
        <div style="text-align:center"><div class="hint" style="font-size:11px">offset</div><div style="color:#ffb347;font-size:26px;font-weight:600">${ms > 0 ? "+" : ""}${ms} ms</div><div class="hint" style="font-size:11px">${beats > 0 ? "+" : ""}${beats} beats</div></div>
        <div style="flex:1">
          <div style="font-size:13px;color:#e8e8ea;margin-bottom:4px">${demo ? "Demo: target delayed 270 ms" : dir}</div>
          <div style="height:8px;background:#202026;border:1px solid #34343b;border-radius:5px;overflow:hidden"><div style="height:100%;width:${(conf * 100).toFixed(0)}%;background:${conf > 0.6 ? "#5ad17a" : "#ffb347"}"></div></div>
          <div class="hint" style="font-size:11px;margin-top:3px">confidence ${(conf * 100).toFixed(0)}%${d.applied ? " · ✓ shifted to " + d.newStartBeats + " beats" : ""}</div>
        </div>
      </div>${svg}
      <div class="hint" style="font-size:11px;margin-top:6px">offset-only alignment (whole clip) — the SDK can't write warp markers, so internal timing isn't stretched.</div>`;
  }

  async function detect(demo) {
    panel.querySelector("#sa-info").textContent = demo ? "Demo…" : "Rendering & correlating stems…";
    const r = await align({ demo: !!demo, guideIndex: Number(panel.querySelector("#sa-g").value), targetIndex: Number(panel.querySelector("#sa-t").value) });
    if (r.success) { render(r.data, !!demo); panel.querySelector("#sa-info").textContent = demo ? "Demo result" : "Detected"; }
    else { panel.querySelector("#sa-info").textContent = r.error + " — showing Demo."; detect(true); }
  }
  panel.querySelector("#sa-detect").onclick = () => detect(false);
  panel.querySelector("#sa-apply").onclick = async () => {
    const r = await align({ guideIndex: Number(panel.querySelector("#sa-g").value), targetIndex: Number(panel.querySelector("#sa-t").value), apply: true });
    if (r.success) { render(r.data, false); panel.querySelector("#sa-info").textContent = r.data.applied ? "Shifted target into alignment" : "Detected (no arrangement audio clip to shift)"; }
    else panel.querySelector("#sa-info").textContent = r.error;
  };
  detect(true);
};
