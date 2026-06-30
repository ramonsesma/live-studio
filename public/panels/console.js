// Rich panel: API Console — a Set scripting console. Run safe commands or arbitrary JS against the
// live Set, and save/load/run scripts that persist to the Set's storage.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.console = function (panel, helpers) {
  const exec = helpers.execute;
  const out = (o) => `<pre style="margin:0;font-size:11px;color:#cbd5d0;white-space:pre-wrap;word-break:break-word">${JSON.stringify(o, null, 2)}</pre>`;

  panel.innerHTML = `
    <div class="panel-head"><h1>⌨️ API Console</h1><p>Run safe commands or arbitrary JS against the live Set. Save scripts to the Set's storage and re-run them anytime.</p></div>
    <div class="ss-toolbar">
      <input id="co-cmd" type="text" placeholder="tempo 128  ·  tracks  ·  create midi  ·  track 0 rename Drums  ·  help" style="flex:1;min-width:240px;font-family:monospace" />
      <button class="btn" id="co-run"><i class="ti ti-player-play" aria-hidden="true"></i> Run</button>
    </div>
    <div id="co-cmdout" style="margin-top:8px;background:#0c0c10;border:1px solid #2a2a32;border-radius:8px;padding:10px;min-height:28px"></div>
    <div style="border:1px solid #2a2a32;border-radius:10px;padding:12px;margin-top:12px;background:#101015">
      <div style="font-size:12px;color:#cbb6ea;margin-bottom:8px">Script editor</div>
      <textarea id="co-script" rows="5" style="width:100%;font-family:monospace;font-size:12px;background:#0c0c10;color:#d8d8df;border:1px solid #2f2f36;border-radius:6px;padding:8px" spellcheck="false">// runs against the live Set — 'song' and 'console' are in scope
const t = await song.createMidiTrack();
t.name = "Console track";
return song.tracks.length;</textarea>
      <div class="ss-toolbar" style="margin-top:8px">
        <input id="co-name" type="text" placeholder="Script name" style="width:200px" />
        <button class="btn ghost" id="co-runscript"><i class="ti ti-player-play" aria-hidden="true"></i> Run script</button>
        <button class="btn" id="co-save"><i class="ti ti-device-floppy" aria-hidden="true"></i> Save</button>
        <span class="hint" id="co-sinfo"></span>
      </div>
      <div id="co-scriptout" style="margin-top:8px"></div>
    </div>
    <div class="ss-toolbar" style="margin-top:12px"><span style="font-size:12px;color:#82c98a">Saved scripts</span><button class="btn ghost" id="co-refresh"><i class="ti ti-refresh" aria-hidden="true"></i></button><span class="hint" id="co-linfo"></span></div>
    <div id="co-list" style="margin-top:6px;display:flex;flex-direction:column;gap:5px"></div>`;

  async function runCmd() {
    const r = await exec("execute_command", { command: panel.querySelector("#co-cmd").value });
    panel.querySelector("#co-cmdout").innerHTML = out(r.success ? r.data : { error: r.error });
  }
  async function runScript() {
    const r = await exec("run_script", { script: panel.querySelector("#co-script").value });
    panel.querySelector("#co-scriptout").innerHTML = out(r.success ? r.data : { error: r.error });
  }
  async function save() {
    const name = panel.querySelector("#co-name").value || "Untitled";
    const r = await exec("save_script", { name, script: panel.querySelector("#co-script").value });
    panel.querySelector("#co-sinfo").textContent = r.success ? `Saved · ${r.data.id}` : (r.error || "Save failed");
    list();
  }
  async function list() {
    const r = await exec("list_saved_scripts", {});
    const scripts = r.success ? r.data.scripts : [];
    panel.querySelector("#co-linfo").textContent = `${scripts.length} saved`;
    panel.querySelector("#co-list").innerHTML = scripts.length ? scripts.map((s) => `
      <div style="display:flex;align-items:center;gap:10px;border:1px solid #2f2f36;border-radius:7px;padding:7px 10px;background:#13131a">
        <span style="flex:1;color:#e8e8ea;font-size:12px">${s.name} <span class="hint" style="font-size:10px">${s.category} · ${s.lines} lines</span></span>
        <button class="btn ghost co-rs" data-id="${s.id}" style="padding:2px 8px"><i class="ti ti-player-play"></i></button>
        <button class="btn ghost co-del" data-id="${s.id}" style="padding:2px 8px"><i class="ti ti-trash"></i></button>
      </div>`).join("") : `<div class="hint" style="padding:8px">No saved scripts yet.</div>`;
    panel.querySelectorAll(".co-rs").forEach((b) => b.onclick = async () => { const r = await exec("run_saved_script", { id: b.dataset.id }); panel.querySelector("#co-scriptout").innerHTML = out(r.success ? r.data : { error: r.error }); });
    panel.querySelectorAll(".co-del").forEach((b) => b.onclick = async () => { await exec("delete_saved_script", { id: b.dataset.id }); list(); });
  }
  panel.querySelector("#co-run").onclick = runCmd;
  panel.querySelector("#co-cmd").addEventListener("keydown", (e) => { if (e.key === "Enter") runCmd(); });
  panel.querySelector("#co-runscript").onclick = runScript;
  panel.querySelector("#co-save").onclick = save;
  panel.querySelector("#co-refresh").onclick = list;
  runCmd && (panel.querySelector("#co-cmd").value = "help");
  runCmd();
  list();
};
