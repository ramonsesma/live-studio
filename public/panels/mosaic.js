// Rich panel: Mosaic — generative loop variations from a clip's audio. Slice + seeded shuffle +
// chance-based per-slice FX → N variations, each with its own waveform, audition and import.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.mosaic = function (panel, helpers) {
  const api = helpers.api;
  const FX = [["reverse", "Reverse", 25], ["stutter", "Stutter", 20], ["pitch", "Pitch", 20], ["tapestop", "Tape stop", 10], ["filter", "Filter", 30], ["flanger", "Flanger", 15], ["bitcrush", "Bitcrush", 15], ["gatereverb", "Gated reverb", 12]];

  panel.innerHTML = `
    <div class="panel-head"><h1>🧩 Mosaic</h1><p>Generative loops from a clip's audio — slice it, shuffle from a seed and roll chance-based FX per slice into reproducible variations.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="mo-trk" type="number" value="0" style="width:46px" /><label class="hint">Clip</label><input id="mo-clip" type="number" value="0" style="width:46px" />
      <label class="hint">Slices</label><select id="mo-n"><option>4</option><option selected>8</option><option>16</option></select>
      <label class="hint">Variations</label><select id="mo-v"><option>2</option><option selected>4</option><option>6</option><option>8</option></select>
      <label class="hint">Crossfade</label><input id="mo-cf" type="number" value="64" style="width:54px" />
      <label class="hint">Seed</label><input id="mo-seed" type="number" value="1" style="width:56px" />
      <button class="btn" id="mo-go"><i class="ti ti-arrows-shuffle" aria-hidden="true"></i> Generate &amp; import</button>
      <button class="btn ghost" id="mo-demo">Preview</button>
      <span class="hint" id="mo-info"></span>
    </div>
    <div id="mo-fx" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px 14px;margin-top:12px"></div>
    <div id="mo-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-top:14px"></div>
    <audio id="mo-audio" style="display:none"></audio>`;

  panel.querySelector("#mo-fx").innerHTML = FX.map(([k, label, def]) =>
    `<div style="display:flex;align-items:center;gap:8px"><label class="hint" style="width:84px">${label}</label><input class="mo-c" data-k="${k}" type="range" min="0" max="100" value="${def}" style="flex:1" /><span class="hint mo-cv" style="width:34px;text-align:right">${def}</span></div>`).join("");
  panel.querySelectorAll(".mo-c").forEach((s) => s.oninput = (e) => e.target.parentElement.querySelector(".mo-cv").textContent = e.target.value);

  function wave(peaks, color) {
    const W = 280, H = 54, mid = H / 2, bw = (W - 2) / peaks.length;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:6px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`;
    peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 8)), x = 1 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.2).toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.85"/>`; });
    return r + `</svg>`;
  }
  function play(url) { const a = panel.querySelector("#mo-audio"); a.src = url; a.currentTime = 0; a.play().catch(() => {}); }
  async function gen(demo) {
    panel.querySelector("#mo-info").textContent = "Generating…";
    const chances = {}; panel.querySelectorAll(".mo-c").forEach((s) => chances[s.dataset.k] = +s.value);
    const body = { trackIndex: +panel.querySelector("#mo-trk").value, clipIndex: +panel.querySelector("#mo-clip").value, slices: +panel.querySelector("#mo-n").value, variations: +panel.querySelector("#mo-v").value, crossfade: +panel.querySelector("#mo-cf").value, seed: +panel.querySelector("#mo-seed").value, chances, import: !demo, demo: !!demo };
    const r = await api.post("/api/mosaic", body);
    if (!r.success) { if (!demo) return gen(true); panel.querySelector("#mo-info").textContent = r.error || "Failed"; return; }
    panel.querySelector("#mo-info").textContent = `${r.data.source === "demo" ? "Demo · " : ""}${r.data.variations} variations · ${r.data.slices} slices`;
    panel.querySelector("#mo-grid").innerHTML = r.data.results.map((v) => `
      <div style="border:1px solid #2f2f36;border-radius:8px;padding:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:12px;color:#e8e8ea">Var ${v.variation} <span class="hint" style="font-size:10px">seed ${v.seed}</span></span>
          <span><button class="mo-play btn ghost" data-u="${v.audio}" style="padding:2px 8px"><i class="ti ti-player-play"></i></button></span></div>
        ${wave(v.wave, "#5ad17a")}<div class="hint" style="font-size:10px;margin-top:4px">${v.outSec}s${v.importedPath ? " · imported" : ""}</div>
      </div>`).join("");
    panel.querySelectorAll(".mo-play").forEach((b) => b.onclick = () => play(b.dataset.u));
  }
  panel.querySelector("#mo-go").onclick = () => gen(false);
  panel.querySelector("#mo-demo").onclick = () => gen(true);
  gen(true);
};
