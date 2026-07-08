// Rich panel: Image → MIDI — the browser decodes any image (Canvas API), downsamples it to a
// luminance grid, and the real grid_to_notes tool writes actual notes on a new track.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.imagemidi = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>🖼️ Image → MIDI</h1><p>Any image becomes notes: rows = pitches (scale-mapped), columns = time, brightness = velocity. Decoded right here, written as a real clip.</p></div>
    <div class="ss-toolbar">
      <input type="file" id="im-file" accept="image/*" style="max-width:220px" />
      <label class="hint">Grid</label>
      <select id="im-res"><option value="16">16×16</option><option value="24" selected>24×24</option><option value="32">32×32</option><option value="48">48×48</option></select>
      <label class="hint">Scale</label>
      <select id="im-scale"><option value="minor_pentatonic" selected>Min pent</option><option value="pentatonic">Maj pent</option><option value="minor">Minor</option><option value="major">Major</option><option value="chromatic">Chromatic</option></select>
      <label class="hint">Invert</label><input id="im-inv" type="checkbox" title="Dark pixels become notes instead of bright ones" />
      <button class="btn ghost" id="im-demo">Demo pattern</button>
      <button class="btn" id="im-write" disabled>Write to Live</button>
      <span class="hint" id="im-info">pick an image…</span>
    </div>
    <div style="display:flex;gap:14px;margin-top:12px;flex-wrap:wrap">
      <canvas id="im-src" width="220" height="220" style="background:#101014;border:1px solid var(--line);border-radius:8px"></canvas>
      <canvas id="im-grid" width="440" height="220" style="background:#101014;border:1px solid var(--line);border-radius:8px"></canvas>
    </div>`;

  let grid = null; // array of rows, each an array of 0-9 levels

  function buildGrid(img) {
    const n = +panel.querySelector("#im-res").value;
    const inv = panel.querySelector("#im-inv").checked;
    const c = document.createElement("canvas");
    c.width = n; c.height = n;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0, n, n);
    const px = g.getImageData(0, 0, n, n).data;
    grid = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let col = 0; col < n; col++) {
        const i = (r * n + col) * 4;
        let lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
        if (inv) lum = 1 - lum;
        // gate the darker half to keep note density musical; map the rest to 1-9
        row.push(lum < 0.42 ? 0 : Math.min(9, Math.max(1, Math.round((lum - 0.42) / 0.58 * 9))));
      }
      grid.push(row);
    }
    drawPreviews(img);
    const cells = grid.flat().filter((v) => v > 0).length;
    panel.querySelector("#im-info").textContent = `${n}×${n} grid · ${cells} note cells`;
    panel.querySelector("#im-write").disabled = cells === 0;
  }

  function drawPreviews(img) {
    const sc = panel.querySelector("#im-src").getContext("2d");
    sc.clearRect(0, 0, 220, 220);
    if (img) sc.drawImage(img, 0, 0, 220, 220);
    const gc = panel.querySelector("#im-grid").getContext("2d");
    gc.clearRect(0, 0, 440, 220);
    if (!grid) return;
    const n = grid.length, cw = 440 / n, ch = 220 / n;
    for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
      const v = grid[r][col];
      if (!v) continue;
      gc.fillStyle = `rgba(238,194,146,${0.25 + (v / 9) * 0.75})`;
      gc.fillRect(col * cw + 0.5, r * ch + 0.5, cw - 1, ch - 1);
    }
  }

  panel.querySelector("#im-file").onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => { buildGrid(img); URL.revokeObjectURL(img.src); };
    img.onerror = () => { panel.querySelector("#im-info").textContent = "couldn't decode that image"; };
    img.src = URL.createObjectURL(f);
  };
  panel.querySelector("#im-res").onchange = () => { const f = panel.querySelector("#im-file").files[0]; if (f) panel.querySelector("#im-file").onchange({ target: { files: [f] } }); };
  panel.querySelector("#im-inv").onchange = panel.querySelector("#im-res").onchange;

  panel.querySelector("#im-demo").onclick = () => {
    const n = +panel.querySelector("#im-res").value;
    grid = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < n; c++) {
        const wave = Math.abs(r - (n / 2 + Math.sin((c / n) * Math.PI * 2) * n * 0.3));
        row.push(wave < 1.6 ? Math.max(3, 9 - Math.floor(wave * 3)) : 0);
      }
      grid.push(row);
    }
    drawPreviews(null);
    const cells = grid.flat().filter((v) => v > 0).length;
    panel.querySelector("#im-info").textContent = `demo sine · ${cells} note cells`;
    panel.querySelector("#im-write").disabled = false;
  };

  panel.querySelector("#im-write").onclick = async () => {
    if (!grid) return;
    const gridStr = grid.map((row) => row.join("")).join("/");
    const r = await exec("grid_to_notes", { grid: gridStr, scale: panel.querySelector("#im-scale").value });
    panel.querySelector("#im-info").textContent = r.success
      ? `✓ wrote ${r.data.noteCount} real notes → track ${r.data.trackIndex + 1} (“${r.data.clipName}”)`
      : r.error;
  };
};
