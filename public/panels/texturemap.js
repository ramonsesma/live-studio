// Rich panel: Audio Texture Mapper — render an audio stem, FFT it per window, map the
// dominant peaks to MIDI and show the result as a piano-roll. Demo proves it offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.texturemap = function (panel, helpers) {
  const api = helpers.api;
  const map = (body) => api.post("/api/texturemap", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>🌫️ Audio Texture Mapper</h1><p>Turns an audio clip into MIDI — dominant spectral peaks per window become notes. Render→FFT, in-host.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="tx-trk" type="number" value="0" style="width:54px" />
      <label class="hint">Notes</label><select id="tx-n"><option>8</option><option selected>16</option><option>32</option></select>
      <label class="hint">Voices</label><select id="tx-poly"><option selected>1</option><option>2</option><option>3</option></select>
      <label class="hint"><input id="tx-snap" type="checkbox" checked /> snap to scale</label>
      <button class="btn" id="tx-map"><i class="ti ti-arrow-right" aria-hidden="true"></i> Map to MIDI</button>
      <span class="hint" id="tx-info">Press Map (renders an audio track) or shows Demo.</span>
    </div>
    <div id="tx-roll"></div>`;

  function render(d) {
    panel.querySelector("#tx-info").textContent = `${d.srcName}: ${d.noteCount} notes${d.snapped ? " · snapped to scale" : ""}${d.clipName ? " → " + d.clipName : ""}`;
    const ns = d.notes || [];
    if (!ns.length) { panel.querySelector("#tx-roll").innerHTML = `<span class="hint">No notes mapped.</span>`; return; }
    const pitches = ns.map((n) => n.pitch), lo = Math.min(...pitches) - 1, hi = Math.max(...pitches) + 1;
    const times = ns.map((n) => n.start), tmax = Math.max(...times, 1) + 1;
    const W = 700, H = 240, rows = Math.max(1, hi - lo);
    const rh = (H - 24) / rows, cw = (W - 30) / tmax;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Piano-roll of mapped notes" style="width:100%;background:#13131a;border:1px solid #38383f;border-radius:10px">`;
    for (let p = lo; p <= hi; p++) {
      const black = [1, 3, 6, 8, 10].includes(((p % 12) + 12) % 12);
      const y = 6 + (hi - p) * rh;
      svg += `<rect x="0" y="${y}" width="${W}" height="${rh}" fill="${black ? "#17171e" : "#1b1b24"}" />`;
      if (((p % 12) + 12) % 12 === 0) svg += `<text x="3" y="${y + rh - 3}" fill="#5c5c66" font-size="9">C${Math.floor(p / 12) - 1}</text>`;
    }
    ns.forEach((n) => {
      const x = 26 + n.start * cw, y = 6 + (hi - n.pitch) * rh;
      const op = 0.4 + (n.velocity || 80) / 200;
      svg += `<rect x="${x}" y="${y + 1}" width="${Math.max(4, cw * 0.9)}" height="${rh - 2}" rx="2" fill="#5ad17a" opacity="${op.toFixed(2)}"><title>${n.name} · ${n.hz} Hz</title></rect>`;
    });
    svg += `</svg><div class="hint" style="font-size:11px;margin-top:4px">pitch ↑ · time → · each note = the dominant frequency of that audio window</div>`;
    panel.querySelector("#tx-roll").innerHTML = svg;
  }

  async function run(demo) {
    panel.querySelector("#tx-info").textContent = demo ? "Demo texture…" : "Rendering & analyzing audio…";
    const r = await map({
      demo: !!demo, trackIndex: Number(panel.querySelector("#tx-trk").value),
      noteCount: Number(panel.querySelector("#tx-n").value), polyphony: Number(panel.querySelector("#tx-poly").value),
      snapScale: panel.querySelector("#tx-snap").checked,
    });
    if (r.success) render(r.data);
    else { panel.querySelector("#tx-info").textContent = r.error + " — showing Demo."; run(true); }
  }
  panel.querySelector("#tx-map").onclick = () => run(false);
  run(true);
};
