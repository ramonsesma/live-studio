// Rich panel: Spectrum Match — overlays two tracks' spectra (via /api/listen) and marks
// the bands where both are loud (overlap/masking). Demo derives two stems offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.spectrumcompare = function (panel, helpers) {
  const api = helpers.api;
  const listen = (body) => api.post("/api/listen", body);
  const NB = 30;

  panel.innerHTML = `
    <div class="panel-head"><h1>🔀 Spectrum Match</h1><p>Compares two tracks' frequency content and highlights where they overlap (masking).</p></div>
    <div class="ss-toolbar">
      <label class="hint">A</label><input id="sm-a" type="number" value="0" style="width:50px" />
      <label class="hint">B</label><input id="sm-b" type="number" value="1" style="width:50px" />
      <button class="btn" id="sm-cmp"><i class="ti ti-git-compare" aria-hidden="true"></i> Compare</button>
      <span class="hint" id="sm-info">Press Compare (renders A & B) or shows Demo.</span>
    </div>
    <div id="sm-chart"></div>`;

  function shape(base, shift, scale) {
    return base.map((_, b) => { const s = (b - shift + NB) % NB; return Math.max(0, Math.min(1, base[s] * scale)); });
  }

  function render(a, b, nameA, nameB) {
    const W = 720, H = 280, x0 = 30, x1 = 710, top = 10, baseY = 240, sc = baseY - top;
    const cw = (x1 - x0) / NB;
    let overlap = "";
    for (let i = 0; i < NB; i++) {
      if (a[i] > 0.55 && b[i] > 0.55) {
        overlap += `<rect x="${x0 + i * cw}" y="${top}" width="${cw}" height="${baseY - top}" fill="#e24b4a" opacity="${(0.12 + Math.min(a[i], b[i]) * 0.3).toFixed(2)}" />`;
      }
    }
    const line = (arr, col, fill) => {
      const pts = arr.map((v, i) => [x0 + (i + 0.5) * cw, baseY - v * sc]);
      const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
      return (fill ? `<path d="${path} L${x1},${baseY} L${x0},${baseY} Z" fill="${col}" opacity="0.10" />` : "") +
        `<path d="${path}" fill="none" stroke="${col}" stroke-width="2.2" />`;
    };
    const labels = [["20", 0], ["100", 0.12], ["500", 0.34], ["1k", 0.5], ["4k", 0.72], ["12k", 0.92]]
      .map((l) => `<text x="${x0 + l[1] * (x1 - x0)}" y="${H - 6}" fill="#6c6c76" font-size="10">${l[0]}</text>`).join("");
    panel.querySelector("#sm-chart").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Two overlaid spectra with overlap highlighted" style="width:100%;background:#13131a;border:1px solid #38383f;border-radius:10px">
        ${overlap}${line(a, "#6cc6ff", true)}${line(b, "#ffb347", true)}${labels}
      </svg>
      <div class="hint" style="font-size:11px;margin-top:4px">
        <span style="color:#6cc6ff">▬</span> ${nameA} · <span style="color:#ffb347">▬</span> ${nameB} ·
        <span style="color:#e24b4a">▮</span> overlap (both loud → masking risk)
      </div>`;
  }

  async function compare() {
    panel.querySelector("#sm-info").textContent = "Rendering & analyzing A and B…";
    const ra = await listen({ trackIndex: Number(panel.querySelector("#sm-a").value) });
    const rb = await listen({ trackIndex: Number(panel.querySelector("#sm-b").value) });
    if (ra.success && rb.success) {
      render(ra.data.analysis.bands.map((x) => x.norm), rb.data.analysis.bands.map((x) => x.norm), ra.data.trackName || "A", rb.data.trackName || "B");
      panel.querySelector("#sm-info").textContent = "A vs B";
    } else { panel.querySelector("#sm-info").textContent = "No audio render here — showing Demo."; demo(); }
  }
  async function demo() {
    const base = await listen({ demo: true });
    const b0 = base.success ? base.data.analysis.bands.map((x) => x.norm) : new Array(NB).fill(0.2);
    render(shape(b0, 0, 1), shape(b0, 4, 0.9), "Bass (demo)", "Synth (demo)");
    panel.querySelector("#sm-info").textContent = "Demo · Bass vs Synth";
  }
  panel.querySelector("#sm-cmp").onclick = compare;
  demo();
};
