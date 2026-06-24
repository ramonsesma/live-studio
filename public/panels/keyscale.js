// Rich panel: Key & Scale Detective — pitch-class histogram + Krumhansl–Schmuckler
// detection, ranked candidates, comparison with Live's scale, and out-of-scale notes.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.keyscale = function (panel, helpers) {
  const exec = helpers.execute;
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

  panel.innerHTML = `
    <div class="panel-head"><h1>🔑 Key &amp; Scale Detective</h1><p>Detects the key from a pitch-class histogram and flags out-of-scale notes. Pure analysis of your MIDI.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="ks-detect"><i class="ti ti-search" aria-hidden="true"></i> Detect</button>
      <label class="hint">Scope</label><input id="ks-trk" type="number" placeholder="all" style="width:64px" />
      <button class="btn ghost" id="ks-foreign">Find foreign notes</button>
      <button class="btn ghost" id="ks-conform"><i class="ti ti-wand" aria-hidden="true"></i> Force to key</button>
      <span class="hint" id="ks-info"></span>
    </div>
    <div style="display:grid;grid-template-columns:230px 1fr;gap:14px;margin-top:6px">
      <div id="ks-result"></div>
      <div id="ks-hist"></div>
    </div>
    <div id="ks-foreign-box" style="margin-top:12px"></div>
    <div id="ks-heat" style="margin-top:12px"></div>`;

  let lastRoot = 9, lastScale = "minor";

  function render(d) {
    lastRoot = d.best.root; lastScale = d.best.scale;
    const conf = Math.max(0, Math.min(1, d.best.confidence));
    const live = d.liveScale || {};
    const liveStr = live.rootName ? `${live.rootName} ${live.name || ""}`.trim() : "—";
    panel.querySelector("#ks-info").textContent = `${d.noteCount} notes analyzed`;
    panel.querySelector("#ks-result").innerHTML = `
      <div style="border:1px solid #2f2f36;border-radius:10px;padding:14px;text-align:center">
        <div class="hint" style="font-size:11px">most likely key</div>
        <div style="color:#ffb347;font-size:26px;font-weight:600;margin:4px 0">${d.best.key}</div>
        <div style="height:8px;background:#202026;border:1px solid #34343b;border-radius:5px;overflow:hidden;margin:8px 0"><div style="height:100%;width:${(conf * 100).toFixed(0)}%;background:#5ad17a"></div></div>
        <div class="hint" style="font-size:11px">confidence ${(conf * 100).toFixed(0)}%</div>
        <div style="margin-top:10px;font-size:12px;color:#9a9aa2">Live's scale: <span style="color:#cfcfd4">${liveStr}</span> ${d.matchesLive ? '<span style="color:#5ad17a">✓ match</span>' : (live.rootName ? '<span style="color:#e24b4a">✗ differs</span>' : "")}</div>
      </div>
      <div style="margin-top:10px">${d.candidates.map((c, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:4px 2px">
          <span style="width:74px;font-size:12px;color:${i === 0 ? "#ffb347" : "#cfcfd4"}">${c.key}</span>
          <span style="flex:1;height:6px;background:#202026;border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:${Math.max(0, c.score) * 100}%;background:${i === 0 ? "#ffb347" : "#4a6a8a"}"></span></span>
        </div>`).join("")}</div>`;

    // chromatic histogram with scale tones of the detected key highlighted
    const scalePcs = new Set(SCALE[d.best.scale].map((x) => (x + d.best.root) % 12));
    const maxW = Math.max(...d.histogram.map((h) => h.weight), 0.001);
    const W = 480, H = 220, x0 = 28, bw = (W - x0 - 8) / 12;
    let bars = "";
    d.histogram.forEach((h, i) => {
      const inScale = scalePcs.has(h.pc), isTonic = h.pc === d.best.root;
      const bh = (h.weight / maxW) * (H - 40), x = x0 + i * bw, y = H - 24 - bh;
      const col = isTonic ? "#ffb347" : inScale ? "#6cc6ff" : "#3a3a44";
      bars += `<rect x="${x + 3}" y="${y}" width="${bw - 6}" height="${bh}" rx="2" fill="${col}" />
        <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" fill="${inScale ? "#cfcfd4" : "#6c6c76"}" font-size="11">${h.name}</text>`;
    });
    panel.querySelector("#ks-hist").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #38383f;border-radius:10px">${bars}</svg>
      <div class="hint" style="font-size:11px;margin-top:4px"><span style="color:#ffb347">▮</span> tonic · <span style="color:#6cc6ff">▮</span> in scale · <span style="color:#3a3a44">▮</span> outside</div>`;
  }

  async function detect() {
    const trk = panel.querySelector("#ks-trk").value;
    const args = trk !== "" ? { track_index: Number(trk) } : {};
    let r = await exec("detect_key", args);
    if (!r.success) { r = await exec("detect_key", { demo: true }); panel.querySelector("#ks-info").textContent = "Demo (no MIDI found) — synthetic A-minor"; }
    if (r.success) render(r.data);
    else panel.querySelector("#ks-info").textContent = r.error;
    heatmap();
  }

  async function heatmap() {
    const r = await exec("project_heatmap", {});
    const box = panel.querySelector("#ks-heat");
    if (!r.success || !r.data.tracks.length) { box.innerHTML = ""; return; }
    const g = r.data.globalKey;
    box.innerHTML = `
      <div style="font-size:12px;color:#9a9aa2;margin-bottom:6px">Per-track fit to the project key ${g ? `(<span style="color:#6cc6ff">${g.name}</span>, ${g.source})` : ""}</div>
      ${r.data.tracks.map((t) => {
        const pct = t.inKeyPct == null ? 0 : t.inKeyPct;
        const col = pct >= 95 ? "#5ad17a" : pct >= 80 ? "#ffb347" : "#e24b4a";
        return `<div style="display:grid;grid-template-columns:110px 1fr 60px 86px;gap:10px;align-items:center;padding:4px 2px">
          <span style="color:#e8e8ea;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</span>
          <span style="height:12px;background:#202026;border:1px solid #34343b;border-radius:6px;overflow:hidden"><span style="display:block;height:100%;width:${pct}%;background:${col}"></span></span>
          <span class="hint" style="font-size:11px;text-align:right">${t.inKeyPct == null ? "—" : pct + "%"}</span>
          <span class="hint" style="font-size:11px;text-align:right">${t.key || ""}</span>
        </div>`;
      }).join("")}`;
  }

  async function conform() {
    const trk = panel.querySelector("#ks-trk").value;
    const args = trk !== "" ? { track_index: Number(trk) } : {};
    const r = await exec("conform_to_scale", args);
    if (!r.success) { panel.querySelector("#ks-info").textContent = r.error; return; }
    panel.querySelector("#ks-info").textContent = `Forced to ${r.data.key}: moved ${r.data.notesMoved}/${r.data.notesTotal} notes in ${r.data.clipsAffected} clips`;
    detect();
  }
  async function foreign() {
    const trk = panel.querySelector("#ks-trk").value;
    const r = await exec("find_foreign_notes", { track_index: trk !== "" ? Number(trk) : 0, root: lastRoot, scale: lastScale });
    const box = panel.querySelector("#ks-foreign-box");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    box.innerHTML = `
      <div style="border:1px solid #2f2f36;border-radius:8px;padding:10px">
        <div style="font-size:13px;color:#e8e8ea">Foreign notes vs ${r.data.key}: <b>${r.data.foreignCount}</b> of ${r.data.total} <span class="hint">(${r.data.inKeyPct}% in key)</span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          ${r.data.foreign.slice(0, 40).map((f) => `<span style="background:#3a1f22;border:1px solid #e24b4a55;color:#ff9b9b;border-radius:5px;padding:2px 7px;font-size:11px">${f.name} @${f.start}</span>`).join("") || '<span class="hint" style="font-size:11px">none — all notes in key 🎯</span>'}
        </div>
      </div>`;
  }
  panel.querySelector("#ks-detect").onclick = detect;
  panel.querySelector("#ks-foreign").onclick = foreign;
  panel.querySelector("#ks-conform").onclick = conform;
  detect();
};
