// Rich panel: Vocal Chain & FX — build a real device chain, then dial in de-esser/EQ/comp on it.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.vocal = function (panel, helpers) {
  const exec = helpers.execute;
  const CHAINS = ["lead","backing","rap","podcast","vocal_fx","harmony"];
  const FX = ["reverb","delay","chorus","doubler","harmonizer","pitch","formant","vocoder","saturation","distortion","tremolo","auto_pan"];
  panel.innerHTML = `
    <div class="panel-head"><h1>🎤 Vocal Chain & FX</h1><p>Build a real device chain on a track, then dial in the de-esser/EQ/compressor it inserted.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="vc-track" type="number" value="0" style="width:70px" />
      <label class="hint">Chain type</label><select id="vc-type">${CHAINS.map((c) => `<option>${c}</option>`).join("")}</select>
      <button class="btn" id="vc-setup">Setup chain</button>
      <span class="hint" id="vc-info"></span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:12px">
      <div>
        <div class="hint" style="margin-bottom:6px">De-esser</div>
        <label class="hint">Frequency (Hz)</label><input id="vc-deessfreq" type="number" value="7500" style="width:100%" />
        <label class="hint">Amount (%)</label><input id="vc-deessamt" type="range" min="0" max="100" value="50" style="width:100%" />
        <button class="btn ghost" id="vc-deess" style="margin-top:6px;width:100%">Set de-esser</button>
      </div>
      <div>
        <div class="hint" style="margin-bottom:6px">EQ</div>
        <label class="hint">HP filter (Hz)</label><input id="vc-hp" type="number" value="80" style="width:100%" />
        <label class="hint">Presence (dB)</label><input id="vc-presence" type="range" min="-6" max="6" value="2" style="width:100%" />
        <label class="hint">Air (dB)</label><input id="vc-air" type="range" min="-6" max="6" value="1" style="width:100%" />
        <button class="btn ghost" id="vc-eq" style="margin-top:6px;width:100%">Set EQ</button>
      </div>
      <div>
        <div class="hint" style="margin-bottom:6px">Compressor</div>
        <label class="hint">Threshold (dB)</label><input id="vc-thresh" type="number" value="-18" style="width:100%" />
        <label class="hint">Ratio</label><input id="vc-ratio" type="number" value="3" style="width:100%" />
        <button class="btn ghost" id="vc-comp" style="margin-top:6px;width:100%">Set compressor</button>
      </div>
    </div>
    <div class="ss-toolbar" style="margin-top:14px">
      <label class="hint">Creative FX</label><select id="vc-fx">${FX.map((f) => `<option>${f}</option>`).join("")}</select>
      <button class="btn ghost" id="vc-addfx">Add FX</button>
    </div>
    <div id="vc-result" style="margin-top:8px;font-size:12px;color:#9a9aa2"></div>`;

  const ti = () => Number(panel.querySelector("#vc-track").value)||0;
  function show(r, ok) { panel.querySelector("#vc-result").textContent = r.success ? (r.data.advisory ? r.data.note : ok(r.data)) : r.error; }

  panel.querySelector("#vc-setup").onclick = async () => {
    const r = await exec("setup_chain", { track_index: ti(), chain_type: panel.querySelector("#vc-type").value });
    panel.querySelector("#vc-info").textContent = r.success ? `Inserted: ${r.data.devicesAdded.join(", ")}` : r.error;
  };
  panel.querySelector("#vc-deess").onclick = async () => show(await exec("set_deesser", { track_index: ti(), frequency: Number(panel.querySelector("#vc-deessfreq").value), amount: Number(panel.querySelector("#vc-deessamt").value) }), (d) => `De-esser: ${d.paramsSet} param(s) set on ${d.device}`);
  panel.querySelector("#vc-eq").onclick = async () => show(await exec("set_vocal_eq", { track_index: ti(), hp_filter: Number(panel.querySelector("#vc-hp").value), presence: Number(panel.querySelector("#vc-presence").value), air: Number(panel.querySelector("#vc-air").value) }), (d) => `EQ: ${d.paramsSet} param(s) set on ${d.device}`);
  panel.querySelector("#vc-comp").onclick = async () => show(await exec("set_vocal_comp", { track_index: ti(), threshold: Number(panel.querySelector("#vc-thresh").value), ratio: Number(panel.querySelector("#vc-ratio").value) }), (d) => `Compressor: ${d.paramsSet} param(s) set on ${d.device}`);
  panel.querySelector("#vc-addfx").onclick = async () => show(await exec("add_vocal_fx", { track_index: ti(), fx_type: panel.querySelector("#vc-fx").value }), (d) => `Inserted ${d.device}`);
};
