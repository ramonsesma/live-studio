window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.fmbell = function (panel, helpers) {
  const api = helpers.api;
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const noteOpts = (sel) => { let o = ""; for (let m = 48; m <= 96; m++) o += `<option value="${m}"${m === sel ? " selected" : ""}>${NN[m % 12]}${Math.floor(m / 12) - 1}</option>`; return o; };
  const PARAMS = [["ratio","Ratio",0.25,12,0.25,2],["index","Index",0,20,0.5,4],["decay","Decay",0.1,4,0.1,1.3],["brightness","Brightness",0,1,0.05,0.5],["length","Length",0.2,6,0.1,1.8]];
  let lastAudio = null;
  panel.innerHTML = `
    <div class="panel-head"><h1>🔔 FM Bell</h1><p>2-operator FM synthesis in-host — bells, tines and e-piano — carrier modulated at a ratio with a decaying index. Audition and import.</p></div>
    <div class="ss-toolbar"><label class="hint">Note</label><select id="fb-note">${noteOpts(60)}</select>
      <button class="btn" id="fb-go"><i class="ti ti-bell" aria-hidden="true"></i> Synthesize &amp; import</button>
      <button class="btn ghost" id="fb-aud"><i class="ti ti-player-play" aria-hidden="true"></i> Audition</button><span class="hint" id="fb-info"></span></div>
    <div id="fb-params" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 16px;margin-top:12px"></div>
    <div id="fb-wave" style="margin-top:12px"></div><audio id="fb-audio" style="display:none"></audio>`;
  panel.querySelector("#fb-params").innerHTML = PARAMS.map(([k, label, min, max, step, def]) => `<div style="display:flex;align-items:center;gap:8px"><label class="hint" style="width:78px">${label}</label><input class="fb-p" data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${def}" style="flex:1" /><span class="hint fb-pv" style="width:44px;text-align:right">${def}</span></div>`).join("");
  panel.querySelectorAll(".fb-p").forEach((s) => s.oninput = (e) => e.target.parentElement.querySelector(".fb-pv").textContent = e.target.value);
  function params() { const p = { note: +panel.querySelector("#fb-note").value }; panel.querySelectorAll(".fb-p").forEach((s) => p[s.dataset.k] = +s.value); return p; }
  function wave(peaks) { if (!peaks || !peaks.length) return ""; const W = 640, H = 90, mid = H / 2, bw = (W - 4) / peaks.length; let r = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#13131a;border:1px solid #2f2f36;border-radius:8px"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#22222a"/>`; peaks.forEach((p, i) => { const h = Math.max(0.6, p * (H - 10)), x = 2 + i * bw; r += `<rect x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${Math.max(0.6, bw - 0.3).toFixed(1)}" height="${h.toFixed(1)}" fill="#57c7e0" opacity="0.85"/>`; }); return r + `</svg>`; }
  async function synth(demo) { panel.querySelector("#fb-info").textContent = "Synthesizing…"; const r = await api.post("/api/bell", { params: params(), import: !demo, demo: !!demo }); if (!r.success) { if (!demo) return synth(true); panel.querySelector("#fb-info").textContent = r.error || "Failed"; return; } lastAudio = r.data.audio; panel.querySelector("#fb-wave").innerHTML = wave(r.data.wave); const n = +panel.querySelector("#fb-note").value; panel.querySelector("#fb-info").textContent = `${NN[n % 12]}${Math.floor(n / 12) - 1} · ${r.data.durSec}s${r.data.importedPath ? " · imported" : ""}`; }
  async function audition() { if (!lastAudio) await synth(true); if (!lastAudio) return; const a = panel.querySelector("#fb-audio"); a.src = lastAudio; a.currentTime = 0; a.play().catch(() => {}); }
  panel.querySelector("#fb-go").onclick = () => synth(false); panel.querySelector("#fb-aud").onclick = audition; synth(true);
};
