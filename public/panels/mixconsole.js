// Rich panel: Mix Console (mix-console-view) — channel strips with faders, pan, mute/solo and
// sends. No live level metering exists in the SDK, so this doesn't claim a "VU" — it's a real
// mixer control surface (fader/pan/mute/solo/sends), not a meter. Pan range fixed to match the
// backend's real 0..1 (0=L, 0.5=C, 1=R) — it used to show a -1..1 slider for a 0..1 value.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.mixconsole = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎛️ Mix Console</h1><p>Real mixer control surface: faders (dB), pan, mute/solo and sends per channel.</p></div>
    <button class="btn ghost" id="mc-refresh" style="margin-bottom:12px">↻ Refresh</button>
    <div id="mc-strips" class="mc-strips"><span class="hint">Loading mixer…</span></div>`;

  const UNITY = 0.85;
  function toDb(v) { if (v <= 0) return -70; if (v >= UNITY) return ((v - UNITY) / (1 - UNITY)) * 6; return 40 * Math.log10(v / UNITY); }
  function fmtDb(db) { return db <= -70 ? "-∞ dB" : `${db > 0 ? "+" : ""}${db.toFixed(1)} dB`; }

  async function refresh() {
    const r = await exec("get_mixer_state", {});
    const box = panel.querySelector("#mc-strips");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    for (const ch of r.data.channels) {
      const strip = document.createElement("div");
      strip.className = "mc-strip";
      const pan = ch.pan ?? 0.5;
      const panLabel = Math.abs(pan - 0.5) < 0.02 ? "C" : pan < 0.5 ? `${Math.round((0.5 - pan) * 200)}L` : `${Math.round((pan - 0.5) * 200)}R`;
      strip.innerHTML = `
        <div class="mc-name">${ch.name}</div>
        <input class="mc-fader" type="range" min="0" max="1" step="0.01" value="${(ch.fader||0).toFixed(2)}" orient="vertical" />
        <div class="hint mc-fdb" style="font-size:10px">${fmtDb(toDb(ch.fader||0))}</div>
        <div class="mc-pan-row"><span class="hint mc-panlabel" style="width:26px;display:inline-block">${panLabel}</span><input class="mc-pan" type="range" min="0" max="1" step="0.01" value="${pan.toFixed(2)}" /></div>
        <div class="mc-btns"><button class="mc-m${ch.muted?' on':''}">M</button><button class="mc-s${ch.soloed?' on':''}">S</button></div>
        ${(ch.sends||[]).length ? `<div class="mc-sends">${ch.sends.map((s) => `<div style="display:flex;align-items:center;gap:4px;font-size:10px"><span class="hint">S${s.sendIndex+1}</span><input class="mc-send" data-i="${s.sendIndex}" type="range" min="0" max="1" step="0.01" value="${(s.value||0).toFixed(2)}" style="width:50px" /></div>`).join("")}</div>` : ""}`;
      strip.querySelector(".mc-fader").onchange = async (e) => { await exec("set_fader", { track_index: ch.index, level: Number(e.target.value) }); strip.querySelector(".mc-fdb").textContent = fmtDb(toDb(Number(e.target.value))); };
      strip.querySelector(".mc-pan").onchange = async (e) => {
        await exec("set_pan", { track_index: ch.index, pan: Number(e.target.value) });
        const p = Number(e.target.value);
        strip.querySelector(".mc-panlabel").textContent = Math.abs(p - 0.5) < 0.02 ? "C" : p < 0.5 ? `${Math.round((0.5 - p) * 200)}L` : `${Math.round((p - 0.5) * 200)}R`;
      };
      strip.querySelectorAll(".mc-send").forEach((el) => el.onchange = (e) => exec("set_send", { track_index: ch.index, send_index: Number(e.target.dataset.i), level: Number(e.target.value) }));
      strip.querySelector(".mc-m").onclick = async (e) => { const r = await exec("toggle_mute", { track_index: ch.index }); e.target.classList.toggle("on", r.data?.muted); };
      strip.querySelector(".mc-s").onclick = async (e) => { const r = await exec("toggle_solo", { track_index: ch.index }); e.target.classList.toggle("on", r.data?.soloed); };
      box.appendChild(strip);
    }
  }
  panel.querySelector("#mc-refresh").onclick = refresh;
  // Live refresh via SSE — suppressed for 1.2s after any local interaction so a rebuild
  // never interrupts a fader drag (oninput keeps firing during the whole drag).
  let lastTouch = 0;
  panel.onpointerdown = () => { lastTouch = Date.now(); };
  panel.oninput = () => { lastTouch = Date.now(); };
  if (helpers.onSongChanged) helpers.onSongChanged(() => { if (Date.now() - lastTouch > 1200) refresh(); });
  refresh();
};
