// Rich panel: Stereo & Imaging — stereo field meters.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.stereo = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎧 Stereo & Imaging</h1><p>Stereo field analysis: width, correlation, L/R levels and mid/side.</p></div>
    <div class="ss-toolbar"><label class="hint">Track</label><input id="st-track" type="number" value="0" style="width:70px" /><button class="btn" id="st-go">Analyze</button>
      <label class="hint">Width preset</label><select id="st-preset"><option>wide</option><option>narrow</option><option>mono</option><option>stereo</option><option>ms_enhance</option><option>center_focus</option></select><button class="btn ghost" id="st-apply">Apply</button>
    </div>
    <div id="st-meters" class="st-meters"><span class="hint">Click "Analyze".</span></div>
    <div class="result" id="st-out" style="display:none"></div>`;

  const out = panel.querySelector("#st-out");
  function show(r){ out.style.display="block"; out.className="result "+(r.success?"ok":"err"); out.textContent=JSON.stringify(r.data||r,null,2); }
  const ti = () => Number(panel.querySelector("#st-track").value) || 0;

  function meter(label, frac, text) {
    return `<div class="st-meter"><div class="hint">${label}</div><div class="st-bar"><div class="st-fill" style="width:${Math.round(frac*100)}%"></div></div><div class="st-val">${text}</div></div>`;
  }
  function corrMeter(c) {
    const left = Math.round(((c + 1) / 2) * 100);
    return `<div class="st-meter"><div class="hint">Correlation (−1 … +1)</div><div class="st-bar corr"><div class="st-corr-mark" style="left:${left}%"></div></div><div class="st-val">${c.toFixed(2)}</div></div>`;
  }

  async function go() {
    const r = await exec("analyze_stereo_field", { track_index: ti() });
    const box = panel.querySelector("#st-meters");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    const d = r.data;
    box.innerHTML =
      meter("Stereo width", d.stereoWidth, (d.stereoWidth*100).toFixed(0) + "%") +
      corrMeter(d.correlation) +
      meter("Level L", (d.leftLevel + 12) / 12, d.leftLevel.toFixed(1) + " dB") +
      meter("Level R", (d.rightLevel + 12) / 12, d.rightLevel.toFixed(1) + " dB") +
      meter("Mid", (d.midSide.mid + 12) / 12, d.midSide.mid.toFixed(1) + " dB") +
      meter("Side", (d.midSide.side + 18) / 18, d.midSide.side.toFixed(1) + " dB");
  }
  panel.querySelector("#st-go").onclick = go;
  panel.querySelector("#st-apply").onclick = async () => show(await exec("apply_width_preset", { track_index: ti(), preset: panel.querySelector("#st-preset").value }));
  go();
};
