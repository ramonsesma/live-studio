// Rich panel: Safe Randomizer — bounded random of a device's parameters with per-param locks.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.saferandom = function (panel, helpers) {
  const api = helpers.api;
  const rnd = (body) => api.post("/api/saferandom", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>🎲 Safe Randomizer</h1><p>Nudges a device's parameters within bounds (explore, don't break) — lock the keepers. Instrument-aware: keeps global volume/pan musical and can target one section.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="sr-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Device</label><input id="sr-dev" type="number" value="0" style="width:50px" />
      <button class="btn ghost" id="sr-read"><i class="ti ti-refresh" aria-hidden="true"></i></button>
      <label class="hint">Amount</label><input id="sr-amt" type="range" min="0" max="100" value="20" /><span class="hint" id="sr-amtv">20%</span>
      <label class="hint">Section</label><select id="sr-cat"><option value="">all</option><option>osc</option><option>filter</option><option>env</option><option>lfo</option><option>fx</option><option>pitch</option></select>
      <label class="hint" title="keep global volume/pan/voice params out of the randomize"><input type="checkbox" id="sr-smart" checked /> smart</label>
      <button class="btn" id="sr-go"><i class="ti ti-dice" aria-hidden="true"></i> Randomize</button>
      <button class="btn ghost" id="sr-reset">Reset</button>
      <span class="hint" id="sr-info"></span>
    </div>
    <div id="sr-knobs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px;margin-top:8px"></div>`;

  let demo = false;

  function knobs(params) {
    panel.querySelector("#sr-knobs").innerHTML = params.map((p, i) => {
      const frac = (p.max - p.min) ? (p.value - p.min) / (p.max - p.min) : 0, a = -135 + frac * 270;
      const col = p.locked ? "#6c6c76" : "#ffb347";
      return `<div style="text-align:center">
        <svg viewBox="0 0 54 54" style="width:46px;cursor:pointer" data-lock="${p.name}" data-i="${i}"><circle cx="27" cy="27" r="21" fill="#202026" stroke="${p.locked ? "#555" : "#3a3a42"}" stroke-width="2" />
        <line x1="27" y1="27" x2="${27 + 15 * Math.sin((a * Math.PI) / 180)}" y2="${27 - 15 * Math.cos((a * Math.PI) / 180)}" stroke="${col}" stroke-width="2.4" stroke-linecap="round" /><circle cx="27" cy="27" r="2.6" fill="${col}" /></svg>
        <div class="hint" style="font-size:9.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.locked ? "🔒 " : ""}${p.name}</div></div>`;
    }).join("");
    panel.querySelectorAll("[data-lock]").forEach((el) => { el.onclick = async () => {
      if (demo) return;
      const cur = params.find((p) => p.name === el.dataset.lock);
      await rnd({ action: cur.locked ? "unlock" : "lock", trackIndex: Number(panel.querySelector("#sr-trk").value), deviceIndex: Number(panel.querySelector("#sr-dev").value), paramName: cur.name });
      read();
    }; });
  }

  async function read() {
    const r = await rnd({ action: "read", trackIndex: Number(panel.querySelector("#sr-trk").value), deviceIndex: Number(panel.querySelector("#sr-dev").value) });
    if (r.success) { demo = false; knobs(r.data.params); panel.querySelector("#sr-info").textContent = `${r.data.deviceName} · ${r.data.params.length} params`; }
    else loadDemo();
  }
  async function loadDemo() {
    const r = await rnd({ demo: true });
    demo = true; knobs(r.data.params); panel.querySelector("#sr-info").textContent = "Demo — lock disabled offline; click Randomize";
  }
  async function go() {
    const amt = Number(panel.querySelector("#sr-amt").value);
    const cat = panel.querySelector("#sr-cat").value || undefined;
    const smart = panel.querySelector("#sr-smart").checked;
    if (demo) { const r = await rnd({ demo: true, action: "randomize", amount: amt, category: cat }); knobs(r.data.params); panel.querySelector("#sr-info").textContent = `Demo · ${cat || "all"} · ±${amt}%`; return; }
    const r = await rnd({ action: "randomize", trackIndex: Number(panel.querySelector("#sr-trk").value), deviceIndex: Number(panel.querySelector("#sr-dev").value), amount: amt, category: cat, smart });
    panel.querySelector("#sr-info").textContent = r.success ? `Randomized ${r.data.paramsChanged} params (±${r.data.amount}%, ${r.data.category})${r.data.skipped ? ` · ${r.data.skipped} kept` : ""}` : r.error; if (r.success) read();
  }
  panel.querySelector("#sr-amt").oninput = (e) => (panel.querySelector("#sr-amtv").textContent = e.target.value + "%");
  panel.querySelector("#sr-read").onclick = read;
  panel.querySelector("#sr-go").onclick = go;
  panel.querySelector("#sr-reset").onclick = async () => { if (demo) return loadDemo(); const r = await rnd({ action: "reset", trackIndex: Number(panel.querySelector("#sr-trk").value), deviceIndex: Number(panel.querySelector("#sr-dev").value) }); panel.querySelector("#sr-info").textContent = r.success ? `Reset ${r.data.paramsRestored} params` : r.error; if (r.success) read(); };
  read();
};
