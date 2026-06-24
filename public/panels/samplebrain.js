// Rich panel: Sample Library Brain — index your samples to a JSON brain and search by
// text/BPM/key or timbral similarity (cosine). Demo indexes a few synthetic samples offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.samplebrain = function (panel, helpers) {
  const api = helpers.api;
  const brain = (body) => api.post("/api/samplebrain", body);

  panel.innerHTML = `
    <div class="panel-head"><h1>🧠 Sample Library Brain</h1><p>Indexes your samples with a perceptual fingerprint; search by BPM, key or similarity and drop into the project.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="sb-index"><i class="ti ti-database" aria-hidden="true"></i> Index</button>
      <input id="sb-q" placeholder="search name/tags…" style="width:150px" />
      <label class="hint">BPM</label><input id="sb-bmin" type="number" placeholder="min" style="width:54px" /><input id="sb-bmax" type="number" placeholder="max" style="width:54px" />
      <input id="sb-key" placeholder="key" style="width:70px" />
      <button class="btn ghost" id="sb-search">Search</button>
      <span class="hint" id="sb-info"></span>
    </div>
    <div id="sb-rows" style="margin-top:8px"></div>`;

  function rows(list, total) {
    panel.querySelector("#sb-info").textContent = `${list.length} / ${total} samples`;
    const box = panel.querySelector("#sb-rows");
    if (!list.length) { box.innerHTML = `<span class="hint">No samples — press Index.</span>`; return; }
    box.innerHTML = `<div style="display:grid;grid-template-columns:1fr 70px 70px 70px 110px;gap:8px;padding:4px 8px;font-size:11px;color:#9a9aa2;border-bottom:1px solid #2f2f36"><span>name · tags</span><span>BPM</span><span>key</span><span>bright</span><span></span></div>`;
    list.forEach((s) => {
      const row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:1fr 70px 70px 70px 110px;gap:8px;align-items:center;padding:7px 8px;border-bottom:1px solid #232329";
      row.innerHTML = `
        <span><span style="color:#e8e8ea;font-size:13px">${s.name}</span>${s.score != null ? ` <span style="color:#5ad17a;font-size:11px">${Math.round(s.score * 100)}% match</span>` : ""}<br><span class="hint" style="font-size:10px">${(s.tags || []).join(" · ")}</span></span>
        <span class="hint" style="font-size:12px">${s.bpm ?? "—"}</span>
        <span class="hint" style="font-size:12px">${s.key ? s.key.replace(" major", " maj").replace(" minor", " min") : "—"}</span>
        <span class="hint" style="font-size:12px">${s.brightness ? s.brightness + "Hz" : "—"}</span>
        <span style="display:flex;gap:5px"><button class="btn ghost sb-sim" style="padding:2px 8px;font-size:11px">Similar</button><button class="btn ghost sb-drop" style="padding:2px 8px;font-size:11px">Drop</button></span>`;
      row.querySelector(".sb-sim").onclick = async () => { const r = await brain({ action: "search", similarTo: s.path, limit: 30 }); if (r.success) { rows(r.data.samples, r.data.total); panel.querySelector("#sb-info").textContent = `similar to ${s.name}`; } };
      row.querySelector(".sb-drop").onclick = async () => { const r = await brain({ action: "drop", path: s.path }); panel.querySelector("#sb-info").textContent = r.success ? `Dropped ${s.name} → track ${r.data.trackIndex}` : r.error; };
      box.appendChild(row);
    });
  }

  async function search() {
    const r = await brain({ action: "search", query: panel.querySelector("#sb-q").value, bpmMin: num("sb-bmin"), bpmMax: num("sb-bmax"), key: panel.querySelector("#sb-key").value || undefined, limit: 60 });
    if (r.success) rows(r.data.samples, r.data.total);
  }
  function num(id) { const v = panel.querySelector("#" + id).value; return v === "" ? undefined : Number(v); }

  async function index() {
    panel.querySelector("#sb-info").textContent = "Indexing…";
    let r = await brain({ action: "index" });
    if (!r.success || r.data.indexed === 0) { r = await brain({ action: "index", demo: true }); panel.querySelector("#sb-info").textContent = "Demo index (synthetic samples)"; }
    if (r.success) { panel.querySelector("#sb-info").textContent = `Indexed ${r.data.indexed} (${r.data.withFeatures} fingerprinted)`; search(); }
  }
  panel.querySelector("#sb-index").onclick = index;
  panel.querySelector("#sb-search").onclick = search;
  panel.querySelector("#sb-q").onkeydown = (e) => { if (e.key === "Enter") search(); };
  index();
};
