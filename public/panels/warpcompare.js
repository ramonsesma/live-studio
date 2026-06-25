// Rich panel: Warp Mode A/B Comparator — renders the clip through Live's 6 warp modes and
// lets you A/B them by ear, then applies the winner.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.warpcompare = function (panel, helpers) {
  const api = helpers.api;
  const warp = (body) => api.post("/api/warpcompare", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>🎧 Warp Mode A/B Comparator</h1><p>Renders the clip through Live's 6 warp modes for a blind listen, then writes the winning mode.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track</label><input id="wc-trk" type="number" value="0" style="width:50px" />
      <label class="hint">Clip</label><input id="wc-clip" type="number" value="0" style="width:50px" />
      <button class="btn" id="wc-go"><i class="ti ti-headphones" aria-hidden="true"></i> Compare</button>
      <span class="hint" id="wc-info">Press Compare (renders 6 modes) or shows Demo.</span>
    </div>
    <div id="wc-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:8px"></div>`;

  function apply(mode) { return warp({ trackIndex: Number(panel.querySelector("#wc-trk").value), clipIndex: Number(panel.querySelector("#wc-clip").value), applyMode: mode }); }

  function render(modes, demo) {
    panel.querySelector("#wc-grid").innerHTML = modes.map((m) => `
      <div style="border:1px solid #2f2f36;border-radius:8px;padding:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="color:#e8e8ea;font-size:13px"><i class="ti ti-wave-square" style="color:#6cc6ff" aria-hidden="true"></i> ${m.name}</span>
          <button class="btn ghost wc-apply" data-mode="${m.id}" style="padding:3px 10px;font-size:11px">Apply</button>
        </div>
        ${m.audio ? `<audio controls preload="none" src="${m.audio}" style="width:100%;height:30px"></audio>` : `<div class="hint" style="font-size:11px">${demo ? "render runs in Live" : "render failed"}</div>`}
      </div>`).join("");
    panel.querySelectorAll(".wc-apply").forEach((b) => { b.onclick = async () => { const r = await apply(Number(b.dataset.mode)); panel.querySelector("#wc-info").textContent = r.success && r.data.applied ? `Applied "${modes.find((x) => x.id == b.dataset.mode).name}" warp mode` : (r.error || "set"); }; });
  }

  async function go(demo) {
    panel.querySelector("#wc-info").textContent = demo ? "Demo" : "Rendering 6 warp modes…";
    const r = await warp({ demo: !!demo, trackIndex: Number(panel.querySelector("#wc-trk").value), clipIndex: Number(panel.querySelector("#wc-clip").value) });
    if (r.success) { render(r.data.modes, !!(r.data.demo)); if (!demo) panel.querySelector("#wc-info").textContent = `${r.data.clipName} · 6 modes rendered`; }
    else { panel.querySelector("#wc-info").textContent = r.error + " — showing Demo."; go(true); }
  }
  panel.querySelector("#wc-go").onclick = () => go(false);
  go(true);
};
