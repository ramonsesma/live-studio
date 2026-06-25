// Rich panel: Probability Lab — variations using native note probability / releaseVelocity.
// Each variation is a real new clip; cell opacity = probability. Demo computes a few offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.probabilitylab = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>🎰 Probability Lab</h1><p>Variations using Live's native note <code>probability</code> + <code>releaseVelocity</code> — patterns that breathe, re-rolled every loop.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="pl-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Clip</label><input id="pl-clip" type="number" value="0" style="width:50px" />
      <label class="hint">Count</label><select id="pl-n"><option>2</option><option selected>4</option><option>5</option></select>
      <button class="btn" id="pl-go"><i class="ti ti-dice" aria-hidden="true"></i> Generate</button>
      <span class="hint" id="pl-info"></span>
    </div>
    <div id="pl-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:8px"></div>`;

  function roll(notes, span) {
    if (!notes.length) return "";
    const ps = notes.map((n) => n.pitch), lo = Math.min(...ps), hi = Math.max(...ps), range = Math.max(1, hi - lo), W = 220, H = 66;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:6px">`;
    for (const n of notes) { const x = (n.start / span) * (W - 4), w = Math.max(2, (n.duration / span) * (W - 4) - 1), y = 4 + ((hi - n.pitch) / range) * (H - 12); r += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="5" rx="1.5" fill="#c792ea" opacity="${(0.2 + (n.prob ?? 1) * 0.8).toFixed(2)}" />`; }
    return r + `</svg>`;
  }

  function render(span, vars, demo) {
    panel.querySelector("#pl-info").textContent = demo ? "Demo (offline) — probability treatments" : `${vars.length} variations as new clips`;
    panel.querySelector("#pl-grid").innerHTML = vars.map((v) => `
      <div style="border:1px solid #2f2f36;border-radius:8px;padding:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="color:#e8e8ea;font-size:12px"><i class="ti ti-wand" style="color:#c792ea" aria-hidden="true"></i> ${v.treatment}</span>
          <span class="hint" style="font-size:10px">${v.noteCount} notes</span>
        </div>
        ${roll(v.notes, span)}
        <div style="display:flex;gap:5px;margin-top:6px">${v.usesProbability ? '<span style="font-size:9.5px;background:#2a2336;border:1px solid #c792ea44;color:#c792ea;border-radius:4px;padding:1px 6px">probability</span>' : ""}${v.usesReleaseVel ? '<span style="font-size:9.5px;background:#16271b;border:1px solid #5ad17a44;color:#5ad17a;border-radius:4px;padding:1px 6px">release vel</span>' : ""}</div>
      </div>`).join("");
  }

  async function gen() {
    const r = await exec("generate", { track_index: Number(panel.querySelector("#pl-trk").value), clip_index: Number(panel.querySelector("#pl-clip").value), count: Number(panel.querySelector("#pl-n").value) });
    if (r.success) render(r.data.span, r.data.variations, false); else demo();
  }
  function demo() {
    const src = [60, 60, 67, 60, 65, 64].map((p, i) => ({ pitch: p, start: i * 0.5, duration: 0.5 }));
    const span = 3;
    render(span, [
      { treatment: "Thinned", noteCount: 6, usesProbability: true, usesReleaseVel: false, notes: src.map((n, i) => ({ ...n, prob: i % 4 === 0 ? 1 : 0.5 })) },
      { treatment: "Ghost notes", noteCount: 12, usesProbability: true, usesReleaseVel: false, notes: src.map((n) => ({ ...n, prob: 1 })).concat(src.map((n) => ({ pitch: n.pitch, start: n.start + 0.25, duration: 0.25, prob: 0.35 }))) },
      { treatment: "Release dynamics", noteCount: 6, usesProbability: false, usesReleaseVel: true, notes: src.map((n) => ({ ...n, prob: 1 })) },
      { treatment: "Humanized prob", noteCount: 6, usesProbability: true, usesReleaseVel: false, notes: src.map((n, i) => ({ ...n, prob: i % 2 ? 0.7 : 1 })) },
    ], true);
  }
  panel.querySelector("#pl-go").onclick = gen;
  demo();
};
