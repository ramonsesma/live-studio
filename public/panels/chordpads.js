// Rich panel: Chord Pads — 4×4 grid of assignable, triggerable pads.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.chordpads = function (panel, helpers) {
  const exec = helpers.execute;
  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  panel.innerHTML = `
    <div class="panel-head"><h1>🎹 Chord Pads</h1><p>Assign a chord to each pad (root + type) and trigger it. 16 pads.</p></div>
    <div class="cp-toolbar">
      <label class="hint">Root</label><select id="cp-root">${NOTES.map(n=>`<option>${n}</option>`).join("")}</select>
      <label class="hint">Type</label><select id="cp-type"><option>major</option></select>
      <span class="hint">Click = assign to selected pad · Double-click = trigger</span>
    </div>
    <div id="cp-grid" class="cp-grid"></div>
    <div class="result" id="cp-out" style="display:none"></div>`;

  const out = panel.querySelector("#cp-out");
  function show(r){ out.style.display="block"; out.className="result "+(r.success?"ok":"err"); out.textContent=JSON.stringify(r.data||r,null,2); }
  const pads = Array.from({length:16}, () => ({ assigned:false, label:"" }));

  (async () => {
    const ch = await exec("get_chords", {});
    if (ch.success) panel.querySelector("#cp-type").innerHTML = ch.data.chords.map(c=>`<option value="${c.name}">${c.name} (${c.description})</option>`).join("");
  })();

  const grid = panel.querySelector("#cp-grid");
  pads.forEach((pad, i) => {
    const el = document.createElement("div");
    el.className = "cp-pad";
    el.innerHTML = `<span class="cp-idx">${i+1}</span><span class="cp-label"></span>`;
    el.onclick = async () => {
      const root = panel.querySelector("#cp-root").value;
      const chord_type = panel.querySelector("#cp-type").value;
      const r = await exec("set_pad", { pad_index: i, root, chord_type });
      if (r.success) { pad.assigned = true; pad.label = r.data.chord; el.classList.add("assigned"); el.querySelector(".cp-label").textContent = r.data.chord; }
      show(r);
    };
    el.ondblclick = async () => { show(await exec("trigger_pad", { pad_index: i })); el.classList.add("hit"); setTimeout(()=>el.classList.remove("hit"),200); };
    grid.appendChild(el);
  });
};
