window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.impact = function (panel, helpers) {
  const api = helpers.api;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const noteOpts = (sel) => { let o = ""; for (let m = 12; m <= 48; m++) o += `<option value="${m}"${m === sel ? " selected" : ""}>${NN[m % 12]}${Math.floor(m / 12) - 1}</option>`; return o; };
  const PARAMS = [["boomDecay","Boom decay",0.1,2.5,0.05,0.7],["noise","Noise",0,100,5,50],["tail","Tail",0,0.9,0.05,0.4],["downpitch","Down-pitch",0,36,1,12],["drive","Drive",0,1,0.05,0.4],["length","Length",0.3,5,0.1,1.6]];
  let lastAudio = null;
  panel.innerHTML = `
    <div class="panel-head"><h1>💥 Impact</h1><p>Synthesize cinematic impacts, booms and downlifters in-host — a pitch-glided boom + noise crack + reverb tail. Audition and import.</p></div>
    <div class="ss-toolbar"><label class="hint">Note</label><select id="im-note">${noteOpts(28)}</select>
      <button class="btn" id="im-go"><i class="ti ti-bomb" aria-hidden="true"></i> Synthesize &amp; import</button>
      <button class="btn ghost" id="im-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button><span class="hint" id="im-info"></span></div>
    <div id="im-params" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 16px;margin-top:12px"></div>
    <div id="im-wave" style="margin-top:12px"></div><audio id="im-audio" style="display:none"></audio>`;
  panel.querySelector("#im-params").innerHTML = PARAMS.map(([k, label, min, max, step, def]) => `<div style="display:flex;align-items:center;gap:8px"><label class="hint" style="width:84px">${label}</label><input class="im-p" data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${def}" style="flex:1" /><span class="hint im-pv" style="width:44px;text-align:right">${def}</span></div>`).join("");
  panel.querySelectorAll(".im-p").forEach((s) => s.oninput = (e) => e.target.parentElement.querySelector(".im-pv").textContent = e.target.value);
  function params() { const p = { note: +panel.querySelector("#im-note").value }; panel.querySelectorAll(".im-p").forEach((s) => p[s.dataset.k] = +s.value); return p; }
  function wave(peaks) { if (!peaks || !peaks.length) return ""; const W = 640, H = 90, mid = H / 2, bw = (W - 4) / peaks.length; let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`; peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="#9a9aa3" opacity="0.85"/>`; }); return r + `</svg>`; }
  async function synth(demo) { panel.querySelector("#im-info").textContent = "Synthesizing…"; const r = await api.post("/api/impact", { params: params(), import: !demo, demo: !!demo }); if (!r.success) { if (!demo) return synth(true); panel.querySelector("#im-info").textContent = r.error || "Failed"; return; } lastAudio = r.data.audio; panel.querySelector("#im-wave").innerHTML = wave(r.data.wave); panel.querySelector("#im-info").textContent = `${r.data.durSec}s${r.data.importedPath ? " · imported" : ""}`; }
  async function audition() { if (!lastAudio) await synth(true); if (!lastAudio) return; const a = panel.querySelector("#im-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {}); }
  panel.querySelector("#im-go").onclick = () => synth(false); panel.querySelector("#im-aud").onclick = audition; synth(true);
};
