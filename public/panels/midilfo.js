// Rich panel: LFO Designer — live waveform preview driven by the real set_lfo_shape /
// set_lfo_bipolar / toggle_lfo tools. Editing a waveform by typing numbers is what the
// autoform couldn't do well.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.midilfo = function (panel, helpers) {
  const exec = helpers.execute;
  const WAVES = ["sine", "triangle", "saw", "saw2", "square", "random", "sample_and_hold", "noise"];

  panel.innerHTML = `
    <div class="panel-head"><h1>〰️ LFO Designer</h1><p>Shape the modulator and preview the waveform. Each control calls the real tool.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Wave</label>
      <select id="lfo-wave">${WAVES.map((w) => `<option value="${w}">${w}</option>`).join("")}</select>
      <label class="hint">Rate</label><input id="lfo-rate" type="number" min="0.01" max="50" step="0.1" value="1" style="width:64px" />
      <label class="hint">Phase</label><input id="lfo-phase" type="range" min="0" max="360" value="0" />
      <label class="hint">PW</label><input id="lfo-pw" type="range" min="1" max="99" value="50" />
      <label class="hint"><input id="lfo-bip" type="checkbox" checked /> bipolar</label>
      <label class="hint"><input id="lfo-on" type="checkbox" checked /> on</label>
      <span class="hint" id="lfo-info"></span>
    </div>
    <div id="lfo-svg"></div>`;

  const seedRnd = (() => { let s = 1234; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; });
  function waveValue(wave, p, pw, steps) {
    switch (wave) {
      case "sine": return Math.sin(2 * Math.PI * p);
      case "triangle": return 1 - 4 * Math.abs(Math.round(p) - p);
      case "saw": return 2 * (p - Math.floor(p + 0.5));
      case "saw2": return -2 * (p - Math.floor(p + 0.5));
      case "square": return (p % 1) < pw ? 1 : -1;
      default: { const i = Math.floor(p * 8) % steps.length; return steps[i]; }
    }
  }

  function draw() {
    const wave = panel.querySelector("#lfo-wave").value;
    const phase = Number(panel.querySelector("#lfo-phase").value) / 360;
    const pw = Number(panel.querySelector("#lfo-pw").value) / 100;
    const bipolar = panel.querySelector("#lfo-bip").checked;
    const on = panel.querySelector("#lfo-on").checked;
    const W = 760, H = 240, x0 = 20, x1 = 740, mid = 120, amp = 90;
    const rnd = seedRnd(); const steps = Array.from({ length: 16 }, () => rnd() * 2 - 1);
    const N = 240, pts = [];
    for (let i = 0; i <= N; i++) {
      const cycles = 2, p = (i / N) * cycles + phase;
      let v = waveValue(wave, p, pw, steps);
      const x = x0 + (i / N) * (x1 - x0);
      const y = bipolar ? mid - v * amp : (210 - ((v + 1) / 2) * 180);
      pts.push([x, y]);
    }
    const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    panel.querySelector("#lfo-svg").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#1a1a1e;border:1px solid #38383f;border-radius:10px">
        <line x1="${x0}" y1="${bipolar ? mid : 210}" x2="${x1}" y2="${bipolar ? mid : 210}" stroke="#34343b" stroke-dasharray="4 4" />
        <path d="${path}" fill="none" stroke="${on ? "#5ad17a" : "#555"}" stroke-width="2.5" />
      </svg>`;
  }

  async function pushShape() {
    const wave = panel.querySelector("#lfo-wave").value;
    const rate = Number(panel.querySelector("#lfo-rate").value);
    const phase = Number(panel.querySelector("#lfo-phase").value);
    const pulse_width = Number(panel.querySelector("#lfo-pw").value);
    const r = await exec("set_lfo_shape", { wave, rate, phase, pulse_width });
    panel.querySelector("#lfo-info").textContent = r.success ? `${wave} · ${rate}Hz` : r.error;
    draw();
  }
  panel.querySelectorAll("#lfo-wave,#lfo-rate,#lfo-phase,#lfo-pw").forEach((el) => { el.oninput = pushShape; });
  panel.querySelector("#lfo-bip").onchange = async (e) => { await exec("set_lfo_bipolar", { bipolar: e.target.checked }); draw(); };
  panel.querySelector("#lfo-on").onchange = async (e) => { await exec("toggle_lfo", { enabled: e.target.checked }); draw(); };
  pushShape();
};
