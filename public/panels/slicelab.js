// Rich panel: Slice Lab — slice an audio clip, reorder + process each step with pattern lanes,
// preview source vs result waveform, audition and import a new loop. Step boxes cycle on click;
// per-lane + global randomize. Works offline against the local renderer; import needs Live.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.slicelab = function (panel, helpers) {
  const api = helpers.api;
  const LANES = [
    { k: "reverse", label: "Reverse", type: "bool" },
    { k: "stutter", label: "Stutter", type: "num", values: [0, 2, 3, 4] },
    { k: "pitch", label: "Pitch", type: "num", values: [-12, -7, -5, 0, 5, 7, 12] },
    { k: "bitcrush", label: "Bitcrush", type: "num", values: [16, 12, 8, 6, 4] },
    { k: "filter", label: "Filter", type: "bool" },
    { k: "tapestop", label: "Tape stop", type: "bool" },
  ];
  let N = 8, order = [], lanes = {}, lastAudio = null;
  function reset() { order = Array.from({ length: N }, (_, i) => i); lanes = {}; LANES.forEach((l) => lanes[l.k] = new Array(N).fill(l.type === "bool" ? 0 : (l.k === "bitcrush" ? 16 : 0))); draw(); }
  function randAll() { order = Array.from({ length: N }, (_, i) => i).sort(() => Math.random() - 0.5); LANES.forEach((l) => { for (let i = 0; i < N; i++) lanes[l.k][i] = l.type === "bool" ? (Math.random() < 0.35 ? 1 : 0) : l.values[Math.floor(Math.random() * l.values.length)]; }); draw(); }

  panel.innerHTML = `
    <div class="panel-head"><h1>🔪 Slice Lab</h1><p>Slice an audio clip, reorder and process each step with pattern lanes, then export a new loop. Your original clip is untouched.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="sl-trk" type="number" value="0" style="width:46px" /><label class="hint">Clip</label><input id="sl-clip" type="number" value="0" style="width:46px" />
      <label class="hint">Slices</label><select id="sl-n"><option>4</option><option selected>8</option><option>16</option></select>
      <label class="hint">Crossfade</label><input id="sl-cf" type="number" value="0" style="width:54px" />
      <button class="btn ghost" id="sl-rand"><i class="ti ti-dice" aria-hidden="true"></i> Randomize all</button>
      <button class="btn ghost" id="sl-reset"><i class="ti ti-refresh" aria-hidden="true"></i> Reset</button>
    </div>
    <div class="ss-toolbar" style="margin-top:8px">
      <label class="hint">Filter</label><select id="sl-fmode"><option value="lp">LP</option><option value="bp">BP</option><option value="hp">HP</option><option value="notch">Notch</option></select>
      <label class="hint">Cutoff</label><input id="sl-fc" type="number" value="1200" style="width:64px" /><label class="hint">Res</label><input id="sl-res" type="number" value="0.3" step="0.05" style="width:50px" /><label class="hint">Sweep</label><input id="sl-sw" type="number" value="0" step="0.1" style="width:50px" />
      <button class="btn" id="sl-go"><i class="ti ti-wand" aria-hidden="true"></i> Mutate &amp; import</button>
      <button class="btn ghost" id="sl-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button>
      <span class="hint" id="sl-info"></span>
    </div>
    <div id="sl-grid" style="margin-top:12px"></div>
    <div style="margin-top:12px"><div class="hint" style="margin-bottom:4px">Source</div><div id="sl-win"></div></div>
    <div style="margin-top:8px"><div class="hint" style="margin-bottom:4px">Result</div><div id="sl-wout"></div></div>
    <audio id="sl-audio" style="display:none"></audio>`;

  function box(val, on, col) { return `<div class="sl-box" style="height:22px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;background:${on ? col : "#1c1c22"};color:${on ? "#0c0c10" : "#6b6b73"};border:1px solid ${on ? col : "#2a2a32"}">${val}</div>`; }
  function draw() {
    let h = `<div style="display:grid;grid-template-columns:70px 1fr;gap:5px 8px;align-items:center">`;
    h += `<div style="font-size:11px;color:#cbb6ea">Order</div><div style="display:grid;grid-template-columns:repeat(${N},1fr);gap:3px">${order.map((o) => box(o, true, "#b58ce0")).join("")}</div>`;
    LANES.forEach((l) => {
      h += `<div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;color:#9a9aa3">${l.label}</span><span class="sl-rl" data-k="${l.k}" title="randomize lane" style="cursor:pointer;color:#6b6b73">⟳</span></div>`;
      h += `<div style="display:grid;grid-template-columns:repeat(${N},1fr);gap:3px">${lanes[l.k].map((v, i) => { const on = l.type === "bool" ? v : (l.k === "bitcrush" ? v < 16 : v !== 0); return `<div data-k="${l.k}" data-i="${i}" class="sl-cell">${box(l.type === "bool" ? (v ? "•" : "") : v, on, "#6cc6ff")}</div>`; }).join("")}</div>`;
    });
    h += `</div>`;
    panel.querySelector("#sl-grid").innerHTML = h;
    panel.querySelectorAll(".sl-cell").forEach((c) => c.onclick = () => { const k = c.dataset.k, i = +c.dataset.i, l = LANES.find((x) => x.k === k); if (l.type === "bool") lanes[k][i] = lanes[k][i] ? 0 : 1; else { const idx = (l.values.indexOf(lanes[k][i]) + 1) % l.values.length; lanes[k][i] = l.values[idx]; } draw(); });
    panel.querySelectorAll(".sl-rl").forEach((b) => b.onclick = () => { const k = b.dataset.k, l = LANES.find((x) => x.k === k); for (let i = 0; i < N; i++) lanes[k][i] = l.type === "bool" ? (Math.random() < 0.35 ? 1 : 0) : l.values[Math.floor(Math.random() * l.values.length)]; draw(); });
  }
  function wave(peaks, color, label) {
    if (!peaks || !peaks.length) return `<div class="hint" style="padding:6px">—</div>`;
    const W = 640, H = 70, mid = H / 2, bw = (W - 4) / peaks.length;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:6px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`;
    for (let s = 1; s < N; s++) { const x = (s / N) * W; r += `<line x1="${x}" y1="4" x2="${x}" y2="${H - 4}" stroke="#2a2a3288"/>`; }
    peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.85"/>`; });
    return r + `<text x="5" y="12" fill="#6b6b73" font-size="8">${label}</text></svg>`;
  }
  async function mutate(demo) {
    panel.querySelector("#sl-info").textContent = "Rendering…";
    const body = { trackIndex: +panel.querySelector("#sl-trk").value, clipIndex: +panel.querySelector("#sl-clip").value, slices: N, lanes: Object.assign({ order }, lanes), filter: { mode: panel.querySelector("#sl-fmode").value, cutoff: +panel.querySelector("#sl-fc").value, res: +panel.querySelector("#sl-res").value, sweep: +panel.querySelector("#sl-sw").value }, crossfade: +panel.querySelector("#sl-cf").value, import: !demo, demo: !!demo };
    const r = await api.post("/api/slicelab", body);
    if (!r.success) { if (!demo) return mutate(true); panel.querySelector("#sl-info").textContent = r.error || "Failed"; return; }
    lastAudio = r.data.audio;
    panel.querySelector("#sl-win").innerHTML = wave(r.data.waveIn, "#74b8e0", `source ${r.data.inSec}s`);
    panel.querySelector("#sl-wout").innerHTML = wave(r.data.waveOut, "#5ad17a", `result ${r.data.outSec}s${r.data.importedPath ? " · imported" : ""}`);
    panel.querySelector("#sl-info").textContent = `${r.data.source === "demo" ? "Demo · " : ""}${N} slices`;
  }
  async function audition() { if (!lastAudio) await mutate(true); if (!lastAudio) return; const a = panel.querySelector("#sl-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {}); }
  panel.querySelector("#sl-n").onchange = (e) => { N = +e.target.value; reset(); };
  panel.querySelector("#sl-rand").onclick = randAll;
  panel.querySelector("#sl-reset").onclick = reset;
  panel.querySelector("#sl-go").onclick = () => mutate(false);
  panel.querySelector("#sl-aud").onclick = audition;
  reset(); mutate(true);
};
