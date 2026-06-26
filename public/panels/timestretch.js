// Rich panel: Time-Stretch — stretch a clip's audio (OLA pitch-preserving or varispeed) and
// import it as a new clip. Before→after waveform + length readout. Demo runs offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.timestretch = function (panel, helpers) {
  const api = helpers.api;

  panel.innerHTML = `
    <div class="panel-head"><h1>⏱️ Time-Stretch</h1><p>Stretch a clip's audio in-host — OLA (pitch-preserving) or varispeed (tape) — and import the result as a new clip. Your original is untouched.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="ts-trk" type="number" value="0" style="width:46px" /><label class="hint">Clip</label><input id="ts-clip" type="number" value="0" style="width:46px" />
      <label class="hint">Mode</label><select id="ts-mode"><option value="ola">OLA (keep pitch)</option><option value="varispeed">Varispeed (tape)</option></select>
      <label class="hint">Grain</label><select id="ts-grain"><option>256</option><option>512</option><option selected>1024</option><option>2048</option><option>4096</option></select>
    </div>
    <div class="ss-toolbar" style="margin-top:8px">
      <label class="hint">Ratio</label><input id="ts-ratio" type="range" min="0.25" max="4" step="0.05" value="1.5" style="width:180px" /><span class="hint" id="ts-ratiov">1.50×</span>
      <label class="hint"><input id="ts-imp" type="checkbox" checked /> import as clip</label>
      <button class="btn" id="ts-go"><i class="ti ti-arrows-horizontal" aria-hidden="true"></i> Stretch</button>
      <button class="btn ghost" id="ts-demo">Demo</button>
      <span class="hint" id="ts-info"></span>
    </div>
    <div style="margin-top:12px"><div class="hint" style="margin-bottom:4px">Before</div><div id="ts-win"></div></div>
    <div style="margin-top:10px"><div class="hint" style="margin-bottom:4px">After</div><div id="ts-wout"></div></div>`;

  function wave(peaks, color, label) {
    if (!peaks || !peaks.length) return `<div class="hint" style="padding:8px">—</div>`;
    const W = 640, H = 64, mid = H / 2, bw = (W - 4) / peaks.length;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:6px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`;
    peaks.forEach((p, i) => { const h = Math.max(0.5, p * (H - 8)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.85"/>`; });
    return r + `<text x="5" y="12" fill="#6b6b73" font-size="8">${label}</text></svg>`;
  }
  function render(d) {
    panel.querySelector("#ts-info").textContent = `${d.source === "demo" ? "Demo · " : ""}${d.mode} ${d.ratio}× · ${d.inSec}s → ${d.outSec}s${d.importedPath ? " · imported" : ""}`;
    panel.querySelector("#ts-win").innerHTML = wave(d.waveIn, "#74b8e0", `${d.inSec}s`);
    panel.querySelector("#ts-wout").innerHTML = wave(d.waveOut, "#5ad17a", `${d.outSec}s · ${d.mode}`);
  }
  async function go(demo) {
    panel.querySelector("#ts-info").textContent = "Processing…";
    const body = demo ? { demo: true, ratio: +panel.querySelector("#ts-ratio").value, mode: panel.querySelector("#ts-mode").value, grain: +panel.querySelector("#ts-grain").value }
      : { trackIndex: +panel.querySelector("#ts-trk").value, clipIndex: +panel.querySelector("#ts-clip").value, ratio: +panel.querySelector("#ts-ratio").value, mode: panel.querySelector("#ts-mode").value, grain: +panel.querySelector("#ts-grain").value, import: panel.querySelector("#ts-imp").checked };
    const r = await api.post("/api/timestretch", body);
    if (r.success) render(r.data); else { panel.querySelector("#ts-info").textContent = r.error || "Failed"; go(true); }
  }
  panel.querySelector("#ts-ratio").oninput = (e) => (panel.querySelector("#ts-ratiov").textContent = (+e.target.value).toFixed(2) + "×");
  panel.querySelector("#ts-go").onclick = () => go(false);
  panel.querySelector("#ts-demo").onclick = () => go(true);
  go(true);
};
