// Rich panel: Mix Console (mix-console-view) — channel strips with faders, pan, mute/solo and VU.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.mixconsole = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎛️ Mix Console</h1><p>Visual mixer: faders, pan, mute/solo and VU per channel.</p></div>
    <button class="btn ghost" id="mc-refresh" style="margin-bottom:12px">↻ Refresh</button>
    <div id="mc-strips" class="mc-strips"><span class="hint">Loading mixer…</span></div>`;

  async function refresh() {
    const r = await exec("get_mixer_state", {});
    const box = panel.querySelector("#mc-strips");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    for (const ch of r.data.channels) {
      const strip = document.createElement("div");
      strip.className = "mc-strip";
      strip.innerHTML = `
        <div class="mc-name">${ch.name}</div>
        <input class="mc-fader" type="range" min="0" max="1" step="0.01" value="${(ch.fader||0).toFixed(2)}" orient="vertical" />
        <div class="hint" style="font-size:10px">${Math.round((ch.fader||0)*100)}%</div>
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
