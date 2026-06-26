// Rich panel: MIDI Transformer — transpose / quantize / humanize / reverse / invert with a
// live before→after piano roll. The preview mirrors each transform client-side; the same op is
// applied to your selected Live clip (and is undoable via Edit History).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.miditransform = function (panel, helpers) {
  const exec = helpers.execute;
  const GRID = { "1/4": 1, "1/8": 0.5, "1/16": 0.25, "1/16t": 1 / 6, "1/32": 0.125 };
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const clampP = (p) => Math.max(0, Math.min(127, Math.round(p)));
  const demo = () => [60,62,64,67,64,62,60,55].map((p, i) => ({ pitch: p, startTime: i * 0.5 + (i % 3 === 0 ? 0 : 0.02), duration: 0.45, velocity: 90 + (i % 4) * 8 }));
  let work = demo(), base = [];

  panel.innerHTML = `
    <div class="panel-head"><h1>🔧 MIDI Transformer</h1><p>Transpose, quantize, humanize, reverse and invert — with a before→after preview. The same op runs on your selected clip (undoable).</p></div>
    <div class="ss-toolbar"><label class="hint">Track</label><input id="mt-trk" type="number" value="0" style="width:46px" /><label class="hint">Clip</label><input id="mt-clip" type="number" value="0" style="width:46px" /><button class="btn ghost" id="mt-reset"><i class="ti ti-refresh" aria-hidden="true"></i> Reset preview</button><span class="hint" id="mt-info">preview = sample phrase</span></div>
    <div id="mt-roll" style="margin-top:10px"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:12px">
      <div style="border:1px solid #2a2a32;border-radius:9px;padding:10px"><div style="font-size:12px;color:#cbb6ea;margin-bottom:7px">Transpose</div><div class="ss-toolbar"><label class="hint">st</label><input id="mt-semi" type="number" value="12" style="width:54px" /><button class="btn" id="mt-tr">Apply</button></div></div>
      <div style="border:1px solid #2a2a32;border-radius:9px;padding:10px"><div style="font-size:12px;color:#cbb6ea;margin-bottom:7px">Quantize</div><div class="ss-toolbar"><select id="mt-grid"><option>1/4</option><option selected>1/8</option><option>1/16</option><option>1/16t</option><option>1/32</option></select><label class="hint">str</label><input id="mt-str" type="number" value="100" style="width:48px" /><label class="hint">sw</label><input id="mt-sw" type="number" value="0" style="width:44px" /><button class="btn" id="mt-q">Apply</button></div></div>
      <div style="border:1px solid #2a2a32;border-radius:9px;padding:10px"><div style="font-size:12px;color:#cbb6ea;margin-bottom:7px">Humanize</div><div class="ss-toolbar"><label class="hint">time</label><input id="mt-ht" type="number" value="0.03" step="0.01" style="width:54px" /><label class="hint">vel</label><input id="mt-hv" type="number" value="12" style="width:48px" /><button class="btn" id="mt-h">Apply</button></div></div>
      <div style="border:1px solid #2a2a32;border-radius:9px;padding:10px"><div style="font-size:12px;color:#cbb6ea;margin-bottom:7px">Reverse / Invert</div><div class="ss-toolbar"><button class="btn" id="mt-rev">Reverse</button><label class="hint">center</label><input id="mt-ctr" type="number" value="60" style="width:48px" /><button class="btn" id="mt-inv">Invert</button></div></div>
    </div>`;

  function roll() {
    const all = base.concat(work); if (!all.length) return;
    const ps = all.map((n) => n.pitch), lo = Math.min(...ps) - 1, hi = Math.max(...ps) + 1, rowH = 12;
    const span = Math.max(...all.map((n) => n.startTime + n.duration), 4), W = 640, H = (hi - lo) * rowH + 8;
    let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px">`;
    for (let p = lo; p <= hi; p++) { const y = (hi - p) * rowH + 4, bl = [1,3,6,8,10].includes(((p % 12) + 12) % 12); r += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="${bl ? "#17171e" : "#15151b"}"/>`; if (((p % 12) + 12) % 12 === 0) r += `<text x="2" y="${y + rowH - 2}" fill="#5b5b63" font-size="7">C${Math.floor(p / 12) - 1}</text>`; }
    for (const n of base) { const x = (n.startTime / span) * (W - 4) + 2, w = Math.max(3, (n.duration / span) * (W - 4) - 1), y = (hi - n.pitch) * rowH + 5; r += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rowH - 2}" rx="2" fill="none" stroke="#4a4a55" stroke-dasharray="2 2"/>`; }
    for (const n of work) { const x = (n.startTime / span) * (W - 4) + 2, w = Math.max(3, (n.duration / span) * (W - 4) - 1), y = (hi - n.pitch) * rowH + 5; r += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rowH - 2}" rx="2" fill="#c792ea" opacity="0.9"><title>${NN[((n.pitch % 12) + 12) % 12]}${Math.floor(n.pitch / 12) - 1}</title></rect>`; }
    panel.querySelector("#mt-roll").innerHTML = r + `</svg>`;
  }
  async function apply(fn, tool, args, label) {
    base = work.map((n) => ({ ...n })); work = fn(work.map((n) => ({ ...n }))); roll();
    const r = await exec(tool, Object.assign({ track_index: +panel.querySelector("#mt-trk").value, clip_index: +panel.querySelector("#mt-clip").value }, args));
    panel.querySelector("#mt-info").textContent = `${label} · ${r.success ? "applied to clip" : "preview only (open a clip in Live)"}`;
  }
  panel.querySelector("#mt-tr").onclick = () => { const s = +panel.querySelector("#mt-semi").value; apply((ns) => ns.map((n) => ({ ...n, pitch: clampP(n.pitch + s) })), "transpose", { semitones: s }, `Transpose ${s > 0 ? "+" : ""}${s}`); };
  panel.querySelector("#mt-q").onclick = () => { const g = GRID[panel.querySelector("#mt-grid").value], str = +panel.querySelector("#mt-str").value / 100, sw = +panel.querySelector("#mt-sw").value / 100; apply((ns) => ns.map((n) => { const idx = Math.round(n.startTime / g); let t = n.startTime + (idx * g - n.startTime) * str; if (idx % 2 === 1) t += g * 0.5 * sw; return { ...n, startTime: Math.max(0, t) }; }), "quantize", { grid: panel.querySelector("#mt-grid").value, strength: +panel.querySelector("#mt-str").value, swing: +panel.querySelector("#mt-sw").value }, "Quantize"); };
  panel.querySelector("#mt-h").onclick = () => { const tv = +panel.querySelector("#mt-ht").value, vv = +panel.querySelector("#mt-hv").value; apply((ns) => ns.map((n) => ({ ...n, startTime: Math.max(0, n.startTime + (Math.random() * 2 - 1) * tv), velocity: clampP((n.velocity ?? 90) + (Math.random() * 2 - 1) * vv) })), "humanize", { timing: tv, velocity: vv }, "Humanize"); };
  panel.querySelector("#mt-rev").onclick = () => { apply((ns) => { const m = Math.max(...ns.map((n) => n.startTime + n.duration)); return ns.map((n) => ({ ...n, startTime: Math.max(0, m - (n.startTime + n.duration)) })); }, "reverse", {}, "Reverse"); };
  panel.querySelector("#mt-inv").onclick = () => { const c = +panel.querySelector("#mt-ctr").value; apply((ns) => ns.map((n) => ({ ...n, pitch: clampP(2 * c - n.pitch) })), "invert", { center_note: c }, "Invert"); };
  panel.querySelector("#mt-reset").onclick = () => { work = demo(); base = []; roll(); panel.querySelector("#mt-info").textContent = "preview reset"; };
  roll();
};
