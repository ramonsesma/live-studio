window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.chordstab = function (panel, helpers) {
  const api = helpers.api;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const noteOpts = (sel) => { let o = ""; for (let m = 36; m <= 72; m++) o += `<option value="${m}"${m === sel ? " selected" : ""}>${NN[m % 12]}${Math.floor(m / 12) - 1}</option>`; return o; };
  const PARAMS = [["decay","Decay",0.05,1.5,0.05,0.35],["cutoff","Cutoff",200,6000,50,2000],["reso","Reso",0,0.9,0.05,0.5],["envMod","Env mod",0,100,5,70],["drive","Drive",0,1,0.05,0.3],["length","Length",0.1,2,0.05,0.6]];
  let lastAudio = null;
  panel.innerHTML = `
    <div class="panel-head"><h1>🎹 Chord Stab</h1><p>Synthesize short, punchy synth chord stabs in-host — a saw stack through a fast filter envelope — then audition and import.</p></div>
    <div class="ss-toolbar"><label class="hint">Root</label><select id="cs-note">${noteOpts(48)}</select><label class="hint">Chord</label><select id="cs-chord"><option>maj</option><option>min</option><option>maj7</option><option selected>min7</option><option>dom7</option><option>sus4</option><option>min9</option></select>
      <button class="btn" id="cs-go"><i class="ti ti-bolt" aria-hidden="true"></i> Synthesize &amp; import</button>
      <button class="btn ghost" id="cs-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button><span class="hint" id="cs-info"></span></div>
    <div id="cs-params" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 16px;margin-top:12px"></div>
    <div id="cs-wave" style="margin-top:12px"></div><audio id="cs-audio" style="display:none"></audio>`;
  panel.querySelector("#cs-params").innerHTML = PARAMS.map(([k, label, min, max, step, def]) => `<div style="display:flex;align-items:center;gap:8px"><label class="hint" style="width:70px">${label}</label><input class="cs-p" data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${def}" style="flex:1" /><span class="hint cs-pv" style="width:44px;text-align:right">${def}</span></div>`).join("");
  panel.querySelectorAll(".cs-p").forEach((s) => s.oninput = (e) => e.target.parentElement.querySelector(".cs-pv").textContent = e.target.value);
  function params() { const p = { note: +panel.querySelector("#cs-note").value, chord: panel.querySelector("#cs-chord").value }; panel.querySelectorAll(".cs-p").forEach((s) => p[s.dataset.k] = +s.value); return p; }
  function wave(peaks) { if (!peaks || !peaks.length) return ""; const W = 640, H = 90, mid = H / 2, bw = (W - 4) / peaks.length; let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`; peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="#b58ce0" opacity="0.85"/>`; }); return r + `</svg>`; }
  async function synth(demo) { panel.querySelector("#cs-info").textContent = "Synthesizing…"; const r = await api.post("/api/stab", { params: params(), import: !demo, demo: !!demo }); if (!r.success) { if (!demo) return synth(true); panel.querySelector("#cs-info").textContent = r.error || "Failed"; return; } lastAudio = r.data.audio; panel.querySelector("#cs-wave").innerHTML = wave(r.data.wave); const n = +panel.querySelector("#cs-note").value; panel.querySelector("#cs-info").textContent = `${NN[n % 12]}${Math.floor(n / 12) - 1} ${r.data.chord} · ${r.data.durSec}s${r.data.importedPath ? " · imported" : ""}`; }
  async function audition() { if (!lastAudio) await synth(true); if (!lastAudio) return; const a = panel.querySelector("#cs-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {}); }
  panel.querySelector("#cs-go").onclick = () => synth(false); panel.querySelector("#cs-aud").onclick = audition; synth(true);
};
