// Rich panel: Tempo Tapper — a big tap button (real BPM from real intervals, applied to the Set).
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.tempotap = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>👆 Tempo Tapper</h1><p>Tap along to detect and set the real tempo from your intervals.</p></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px">
      <button id="tt-tap" style="width:180px;height:180px;border-radius:50%;background:#232329;border:3px solid #6cc6ff;color:#e8e8ea;font-size:20px;font-weight:700;cursor:pointer">TAP</button>
      <div style="font-size:38px;font-weight:700;color:#6cc6ff" id="tt-bpm">— BPM</div>
      <div class="hint" id="tt-info">Tap at least twice to detect a tempo. Pausing 3s+ resets the sequence.</div>
      <div class="ss-toolbar">
        <button class="btn ghost" id="tt-reset">Reset taps</button>
        <label class="hint">Manual BPM</label><input id="tt-manual" type="number" min="20" max="300" value="120" style="width:80px" />
        <button class="btn ghost" id="tt-setmanual">Set tempo</button>
      </div>
    </div>`;

  panel.querySelector("#tt-tap").onclick = async () => {
    const r = await exec("tap", { apply: true });
    if (r.success && r.data.currentBpm) { panel.querySelector("#tt-bpm").textContent = `${r.data.currentBpm} BPM`; panel.querySelector("#tt-info").textContent = `${r.data.tapCount} taps${r.data.appliedTempo ? " · tempo applied to the Set" : ""}`; }
    else panel.querySelector("#tt-info").textContent = `${r.data?.tapCount || 1} tap(s) — keep going…`;
  };
  panel.querySelector("#tt-reset").onclick = async () => {
    const r = await exec("tap_reset", {});
    panel.querySelector("#tt-bpm").textContent = "— BPM";
    panel.querySelector("#tt-info").textContent = r.success ? `Cleared ${r.data.tapsCleared} tap(s).` : r.error;
  };
  panel.querySelector("#tt-setmanual").onclick = async () => {
    const tap_tempo = Number(panel.querySelector("#tt-manual").value);
    const r = await exec("set_from_taps", { tap_tempo });
    panel.querySelector("#tt-info").textContent = r.success ? `Tempo set to ${r.data.newTempo} BPM (was ${r.data.previousTempo})` : r.error;
  };
};
