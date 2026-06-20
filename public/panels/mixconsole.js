// Panel rico: Mix Console (mix-console-view) — tiras de canal con faders, pan, mute/solo y VU.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.mixconsole = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎛️ Mix Console</h1><p>Mixer visual: faders, pan, mute/solo y VU por canal.</p></div>
    <button class="btn ghost" id="mc-refresh" style="margin-bottom:12px">↻ Refrescar</button>
    <div id="mc-strips" class="mc-strips"><span class="hint">Cargando mixer…</span></div>`;

  async function refresh() {
    const r = await exec("get_mixer_state", {});
    const box = panel.querySelector("#mc-strips");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    for (const ch of r.data.channels) {
      const strip = document.createElement("div");
      strip.className = "mc-strip";
      const vu = Math.round((ch.vuMeter||0)*100);
      strip.innerHTML = `
        <div class="mc-name">${ch.name}</div>
        <div class="mc-vu"><div class="mc-vu-fill" style="height:${vu}%"></div></div>
        <input class="mc-fader" type="range" min="0" max="1" step="0.01" value="${(ch.fader||0).toFixed(2)}" orient="vertical" />
        <div class="mc-pan-row"><span class="hint">pan</span><input class="mc-pan" type="range" min="-1" max="1" step="0.05" value="${(ch.pan||0).toFixed(2)}" /></div>
        <div class="mc-btns"><button class="mc-m${ch.muted?' on':''}">M</button><button class="mc-s${ch.soloed?' on':''}">S</button></div>`;
      strip.querySelector(".mc-fader").onchange = (e) => exec("set_fader", { track_index: ch.index, level: Number(e.target.value) });
      strip.querySelector(".mc-pan").onchange = (e) => exec("set_pan", { track_index: ch.index, pan: Number(e.target.value) });
      strip.querySelector(".mc-m").onclick = async (e) => { const r = await exec("toggle_mute", { track_index: ch.index }); e.target.classList.toggle("on", r.data?.muted); };
      strip.querySelector(".mc-s").onclick = async (e) => { const r = await exec("toggle_solo", { track_index: ch.index }); e.target.classList.toggle("on", r.data?.soloed); };
      box.appendChild(strip);
    }
  }
  panel.querySelector("#mc-refresh").onclick = refresh;
  refresh();
};
