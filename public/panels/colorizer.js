// Rich panel: Clip Colorizer — color a track's (or the whole project's) clips by a real metric.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.colorizer = function (panel, helpers) {
  const exec = helpers.execute;
  const SCHEMES = ["heatmap","coolmap","pastel","monochrome"];
  panel.innerHTML = `
    <div class="panel-head"><h1>🎨 Clip Colorizer</h1><p>Color clips by a real metric — velocity, pitch, duration or content role.</p></div>
    <div class="ss-toolbar">
      <label class="hint">Track (blank = whole project for "role")</label><input id="cz-track" type="number" value="0" style="width:70px" />
      <button class="btn ghost" id="cz-list">List clips</button>
      <span class="hint" id="cz-info"></span>
    </div>
    <div id="cz-clips" style="margin:8px 0"></div>
    <div class="ss-toolbar">
      <label class="hint">Scheme</label><select id="cz-scheme">${SCHEMES.map((s) => `<option>${s}</option>`).join("")}</select>
      <button class="btn" id="cz-vel">By velocity</button>
      <button class="btn" id="cz-pitch">By pitch</button>
      <button class="btn" id="cz-dur">By duration</button>
      <button class="btn" id="cz-role">By content role (whole project)</button>
      <button class="btn ghost" id="cz-clear">Clear colors</button>
    </div>
    <div id="cz-result" style="margin-top:8px;font-size:12px;color:#9a9aa2"></div>`;

  const ti = () => Number(panel.querySelector("#cz-track").value)||0;
  const scheme = () => panel.querySelector("#cz-scheme").value;
  const hex = (n) => "#" + (n >>> 0).toString(16).padStart(6, "0");

  panel.querySelector("#cz-list").onclick = async () => {
    const r = await exec("get_track_clips", { track_index: ti() });
    const box = panel.querySelector("#cz-clips");
    if (!r.success) { box.innerHTML = `<span class="hint">${r.error}</span>`; return; }
    panel.querySelector("#cz-info").textContent = `${r.data.trackName} · ${r.data.clipCount} clips`;
    box.innerHTML = r.data.clips.map((c) => `<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid #2f2f36;border-radius:6px;padding:3px 8px;margin:0 4px 4px 0;font-size:11px">
      <span style="width:10px;height:10px;border-radius:2px;background:${c.color != null ? hex(c.color) : '#444'}"></span>${c.name}</span>`).join("");
  };
  async function run(name, extra) {
    const r = await exec(name, { track_index: name === "color_by_role" && !panel.querySelector("#cz-track").value ? undefined : ti(), scheme: scheme(), ...extra });
    panel.querySelector("#cz-result").textContent = r.success ? (r.data.byRole ? `Colored ${r.data.clipsColored} clips: ${Object.entries(r.data.byRole).map(([k,v]) => `${k}=${v}`).join(", ")}` : `Colored ${r.data.clipsColored} clip(s)`) : r.error;
  }
  panel.querySelector("#cz-vel").onclick = () => run("color_by_velocity");
  panel.querySelector("#cz-pitch").onclick = () => run("color_by_pitch");
  panel.querySelector("#cz-dur").onclick = () => run("color_by_duration");
  panel.querySelector("#cz-role").onclick = () => run("color_by_role");
  panel.querySelector("#cz-clear").onclick = async () => { const r = await exec("clear_clip_colors", { track_index: ti() }); panel.querySelector("#cz-result").textContent = r.success ? `Reset ${r.data.clipsReset} clip(s)` : r.error; };
};
