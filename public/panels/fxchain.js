// Rich panel: FX Chains (audio-effects-chain).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.fxchain = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>⛓️ FX Chains</h1><p>Pre-built effects chains by genre — apply a full chain to a track.</p></div>
    <div class="fx-toolbar">
      <label class="hint">Target track</label>
      <input id="fx-track" type="number" value="0" style="width:80px" />
    </div>
    <div id="fx-chains" class="fx-grid"><span class="hint">Loading chains…</span></div>
    <div class="result" id="fx-out" style="display:none"></div>`;

  const out = panel.querySelector("#fx-out");
  function show(r){ out.style.display="block"; out.className="result "+(r.success?"ok":"err"); out.textContent=JSON.stringify(r,null,2); }
  const trackIdx = () => Number(panel.querySelector("#fx-track").value)||0;

  (async () => {
    const r = await exec("get_effects_chains", {});
    const box = panel.querySelector("#fx-chains");
    box.innerHTML = "";
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    for (const c of r.data.chains) {
      const card = document.createElement("div");
      card.className = "fx-card";
      card.innerHTML = `<h3>${c.name}</h3><p class="hint">${c.description||""}</p>
        <div class="fx-effects">${(c.effects||[]).map(e=>`<span class="fx-pill">${e.type}</span>`).join("")}</div>
        <button class="btn">Apply to track</button>`;
      card.querySelector("button").onclick = async () => {
        show(await exec("apply_effects_chain", { chain_id: c.id, track_indices: [trackIdx()] }));
      };
      box.appendChild(card);
    }
  })();
};
