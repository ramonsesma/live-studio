// Rich panel: Spectrogram — spectrum bars from the real bins.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.spectrogram = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>📈 Spectrogram</h1><p>Real-time spectrum and spectral peaks of a track.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="sp-track" type="number" value="0" style="width:80px" />
      <label class="hint">FFT</label>
      <select id="sp-fft"><option>512</option><option selected>1024</option><option>2048</option></select>
      <button class="btn" id="sp-go">Analyze</button>
    </div>
    <div id="sp-bars" class="sp-bars"><span class="hint">Click "Analyze".</span></div>
    <h3 style="margin-top:14px">Peaks / harmonics</h3>
    <div id="sp-peaks" class="sp-peaks"><span class="hint">—</span></div>`;

  async function go() {
    const track_index = Number(panel.querySelector("#sp-track").value)||0;
    const fft_size = Number(panel.querySelector("#sp-fft").value);
    const spec = await exec("analyze_spectrum", { track_index, fft_size });
    const bars = panel.querySelector("#sp-bars");
    bars.innerHTML = "";
    if (!spec.success) { bars.innerHTML = `<span class="hint">${spec.error}</span>`; return; }
    const bins = spec.data.bins.filter((_, i) => i % 2 === 0);
    for (const b of bins) {
      const bar = document.createElement("div");
      bar.className = "sp-bar";
      bar.style.height = Math.max(2, Math.round((b.magnitude||0)*100)) + "%";
      bar.title = `${b.freq} Hz`;
      bars.appendChild(bar);
    }
    const pk = await exec("get_peaks", { track_index });
    const pbox = panel.querySelector("#sp-peaks");
    pbox.innerHTML = "";
    if (pk.success) for (const p of pk.data.peaks) {
      const s = document.createElement("span"); s.className = "org-chip";
      s.textContent = `${p.freq} Hz${p.harmonic ? " · "+p.harmonic : " · fund."}`;
      pbox.appendChild(s);
    }
  }
  panel.querySelector("#sp-go").onclick = go;
  go();
};
