// Rich panel: MIDI Randomizer — randomize pitch / velocity / timing / duration with a before→
// after piano roll. Preview mirrors the math; the same op runs on your selected Live clip
// (undoable via Edit History).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.randomizer = function (panel, helpers) {
  const exec = helpers.execute;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const clampP = (p) => Math.max(0, Math.min(127, Math.round(p)));
  const clampV = (v) => Math.max(1, Math.min(127, Math.round(v)));
  const demo = () => [60,62,64,65,67,65,64,62].map((p, i) => ({ pitch: p, startTime: i * 0.5, duration: 0.45, velocity: 96 }));
  let work = demo(), base = [];

  panel.innerHTML = `
    <div class="panel-head"><h1>🎲 MIDI Randomizer</h1><p>Randomize pitch, velocity, timing and duration within bounds — before→after preview, applied to your selected clip (undoable).</p></div>
    <div class="ss-toolbar"><label class="hint">Track</label><input id="r-trk" type="number" value="0" style="width:46px" /><label class="hint">Clip</label><input id="r-clip" type="number" value="0" style="width:46px" /><button class="btn ghost" id="r-reset"><i class="ti ti-refresh" aria-hidden="true"></i> Reset</button><button class="btn" id="r-all"><i class="ti ti-dice" aria-hidden="true"></i> Randomize all</button><span class="hint" id="r-info">preview = sample phrase</span></div>
    <div id="r-roll" style="margin-top:10px"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:12px">
      <div style="border:1px solid #2a2a32;border-radius:9px;padding:10px"><div style="font-size:12px;color:#cbb6ea;margin-bottom:7px">Pitch</div><div class="ss-toolbar"><label class="hint">min</label><input id="r-pmin" type="number" value="55" style="width:48px" /><label class="hint">max</label><input id="r-pmax" type="number" value="72" style="width:48px" /><label class="hint">prob</label><input id="r-pprob" type="number" value="60" style="width:48px" /><button class="btn" id="r-p">Apply</button></div></div>
      <div style="border:1px solid #2a2a32;border-radius:9px;padding:10px"><div style="font-size:12px;color:#cbb6ea;margin-bottom:7px">Velocity</div><div class="ss-toolbar"><label class="hint">min</label><input id="r-vmin" type="number" value="50" style="width:48px" /><label class="hint">max</label><input id="r-vmax" type="number" value="110" style="width:48px" /><button class="btn" id="r-v">Apply</button></div></div>
      <div style="border:1px solid #2a2a32;border-radius:9px;padding:10px"><div style="font-size:12px;color:#cbb6ea;margin-bottom:7px">Timing</div><div class="ss-toolbar"><label class="hint">amount</label><input id="r-tamt" type="number" value="0.08" step="0.02" style="width:54px" /><button class="btn" id="r-t">Apply</button></div></div>
      <div style="border:1px solid #2a2a32;border-radius:9px;padding:10px"><div style="font-size:12px;color:#cbb6ea;margin-bottom:7px">Duration</div><div class="ss-toolbar"><label class="hint">min</label><input id="r-dmin" type="number" value="0.2" step="0.05" style="width:52px" /><label class="hint">max</label><input id="r-dmax" type="number" value="0.7" step="0.05" style="width:52px" /><button class="btn" id="r-d">Apply</button></div></div>
    </div>`;

  function roll() {
    const all = base.concat(work); if (!all.length) return;
    const ps = all.map((n) => n.pitch), lo = Math.min(...ps) - 1, hi = Math.max(...ps) + 1, rowH = 12;
    const span = Math.max(...all.map((n) => n.startTime + n.duration), 4), W = 640, H = (hi - lo) * rowH + 8;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px">`;
    for (let p = lo; p <= hi; p++) { const y = (hi - p) * rowH + 4, bl = [1,3,6,8,10].includes(((p % 12) + 12) % 12); r += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="${bl ? "#17171e" : "#15151b"}"/>`; if (((p % 12) + 12) % 12 === 0) r += `<text x="2" y="${y + rowH - 2}" fill="#5b5b63" font-size="7">C${Math.floor(p / 12) - 1}</text>`; }
    for (const n of base) { const x = (n.startTime / span) * (W - 4) + 2, w = Math.max(3, (n.duration / span) * (W - 4) - 1), y = (hi - n.pitch) * rowH + 5; r += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rowH - 2}" rx="2" fill="none" stroke="#4a4a55" stroke-dasharray="2 2"/>`; }
    for (const n of work) { const x = (n.startTime / span) * (W - 4) + 2, w = Math.max(3, (n.duration / span) * (W - 4) - 1), y = (hi - n.pitch) * rowH + 5; r += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rowH - 2}" rx="2" fill="#c792ea" opacity="${(0.4 + (n.velocity / 127) * 0.6).toFixed(2)}"><title>${NN[((n.pitch % 12) + 12) % 12]}${Math.floor(n.pitch / 12) - 1} · v${n.velocity}</title></rect>`; }
    panel.querySelector("#r-roll").innerHTML = r + `</svg>`;
  }
  async function apply(fn, tool, args, label) {
    base = work.map((n) => ({ ...n })); work = fn(work.map((n) => ({ ...n }))); roll();
    const r = await exec(tool, Object.assign({ track_index: +panel.querySelector("#r-trk").value, clip_index: +panel.querySelector("#r-clip").value }, args));
    panel.querySelector("#r-info").textContent = `${label} · ${r.success ? "applied to clip" : "preview only (open a clip in Live)"}`;
  }
  const v = (id) => +panel.querySelector(id).value;
  panel.querySelector("#r-p").onclick = () => apply((ns) => ns.map((n) => Math.random() < v("#r-pprob") / 100 ? { ...n, pitch: clampP(v("#r-pmin") + Math.random() * (v("#r-pmax") - v("#r-pmin"))) } : n), "randomize_pitch", { min_pitch: v("#r-pmin"), max_pitch: v("#r-pmax"), probability: v("#r-pprob") }, "Pitch");
  panel.querySelector("#r-v").onclick = () => apply((ns) => ns.map((n) => ({ ...n, velocity: clampV(v("#r-vmin") + Math.random() * (v("#r-vmax") - v("#r-vmin"))) })), "randomize_velocity", { min_velocity: v("#r-vmin"), max_velocity: v("#r-vmax") }, "Velocity");
  panel.querySelector("#r-t").onclick = () => apply((ns) => ns.map((n) => ({ ...n, startTime: Math.max(0, n.startTime + (Math.random() * 2 - 1) * v("#r-tamt")) })), "randomize_timing", { amount: v("#r-tamt") }, "Timing");
  panel.querySelector("#r-d").onclick = () => apply((ns) => ns.map((n) => ({ ...n, duration: v("#r-dmin") + Math.random() * (v("#r-dmax") - v("#r-dmin")) })), "randomize_duration", { min_duration: v("#r-dmin"), max_duration: v("#r-dmax") }, "Duration");
  panel.querySelector("#r-all").onclick = () => apply((ns) => ns.map((n) => ({ pitch: clampP(55 + Math.random() * 17), startTime: Math.max(0, n.startTime + (Math.random() * 2 - 1) * 0.08), duration: 0.2 + Math.random() * 0.5, velocity: clampV(50 + Math.random() * 60) })), "randomize_all", { timing_amount: 0.08 }, "Randomize all");
  panel.querySelector("#r-reset").onclick = () => { work = demo(); base = []; roll(); panel.querySelector("#r-info").textContent = "preview reset"; };
  roll();
};
