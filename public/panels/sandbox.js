// Rich panel: Live Coding Sandbox — a real code editor + output, instead of an autoform textarea.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.sandbox = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>💻 Live Coding Sandbox</h1><p>Run TypeScript/JS against the real <code>song</code> object. Creative tool — you're scripting the real Set.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="sb-run">▶ Run</button>
      <button class="btn ghost" id="sb-globals">Safe globals</button>
      <span class="hint" id="sb-info"></span>
    </div>
    <textarea id="sb-code" spellcheck="false" style="width:100%;min-height:160px;margin-top:8px;background:#13131a;color:#e8e8ea;border:1px solid #2f2f36;border-radius:8px;padding:10px;font-family:var(--font-mono);font-size:13px;resize:vertical">return song.tracks.map(t => t.name);</textarea>
    <div class="hint" style="margin-top:4px">Autocomplete reference (type a prefix)</div>
    <div class="ss-toolbar">
      <input id="sb-prefix" type="text" placeholder="song." style="width:140px" />
      <button class="btn ghost" id="sb-ac">Suggest</button>
      <span class="hint" id="sb-suggestions"></span>
    </div>
    <pre id="sb-output" class="result" style="margin-top:10px;white-space:pre-wrap"></pre>`;

  function show(r) {
    const out = panel.querySelector("#sb-output");
    out.className = "result " + (r.success ? "ok" : "err");
    out.textContent = JSON.stringify(r.success ? r.data.result : r.error, null, 2);
  }
  panel.querySelector("#sb-run").onclick = async () => {
    const code = panel.querySelector("#sb-code").value;
    panel.querySelector("#sb-info").textContent = "Running…";
    const r = await exec("eval_typescript", { code, return_value: true });
    panel.querySelector("#sb-info").textContent = r.success ? "OK" : "Error";
    show(r);
  };
  panel.querySelector("#sb-globals").onclick = async () => {
    const r = await exec("list_safe_globals", {});
    panel.querySelector("#sb-info").textContent = r.success ? r.data.globals.join(", ") : r.error;
  };
  panel.querySelector("#sb-ac").onclick = async () => {
    const r = await exec("get_api_autocomplete", { prefix: panel.querySelector("#sb-prefix").value });
    panel.querySelector("#sb-suggestions").textContent = r.success ? (r.data.suggestions.join(", ") || "(no matches)") : r.error;
  };
};
