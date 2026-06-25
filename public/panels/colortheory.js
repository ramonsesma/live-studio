// Rich panel: Color Theory Palette — pick a base color + harmony scheme, preview swatches,
// apply real clip.color to a track. Palette math runs client-side too, so it previews offline.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.colortheory = function (panel, helpers) {
  const exec = helpers.execute;

  panel.innerHTML = `
    <div class="panel-head"><h1>🎨 Color Theory Palette</h1><p>Generates a harmonic palette (complementary, triadic, analogous, tetradic, monochromatic) from a base hue and applies real <code>clip.color</code> values. <span class="hint">Note: the SDK only colors clips — tracks/scenes have no color.</span></p></div>
    <div class="ss-toolbar">
      <label class="hint">Base</label><input id="ct-hex" type="color" value="#ff8c00" style="width:42px;height:28px;padding:0;border:none;background:none" />
      <label class="hint">Scheme</label>
      <select id="ct-scheme"><option value="complementary">Complementary</option><option value="triadic" selected>Triadic</option><option value="analogous">Analogous</option><option value="tetradic">Tetradic</option><option value="monochromatic">Monochromatic</option></select>
      <label class="hint">Count</label><input id="ct-n" type="number" value="6" style="width:50px" />
      <label class="hint">Track</label><input id="ct-trk" type="number" value="0" style="width:50px" />
      <button class="btn" id="ct-apply"><i class="ti ti-palette" aria-hidden="true"></i> Apply to track</button>
      <span class="hint" id="ct-info"></span>
    </div>
    <div id="ct-swatches" style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"></div>`;

  function hexToHsl(hex) { const m = hex.replace("#", "").match(/.{2}/g).map((h) => parseInt(h, 16) / 255); const [r, g, b] = m; const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2; let h = 0, s = 0; if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return { h: h * 360, s, l }; }
  function hslToHex(h, s, l) { h = (((h % 360) + 360) % 360) / 360; const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; const to = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255); return "#" + [to(f(0)), to(f(8)), to(f(4))].map((v) => v.toString(16).padStart(2, "0")).join(""); }
  const SCHEMES = { complementary: [0, 180], triadic: [0, 120, 240], analogous: [-30, 0, 30, 60], tetradic: [0, 90, 180, 270], monochromatic: [0, 0, 0, 0, 0] };
  function palette(hex, scheme, count) { const base = hexToHsl(hex), off = SCHEMES[scheme], out = []; for (let i = 0; i < count; i++) { const o = off[i % off.length], ring = Math.floor(i / off.length), l = scheme === "monochromatic" ? Math.max(0.2, Math.min(0.85, 0.3 + i * 0.12)) : Math.max(0.3, Math.min(0.7, base.l + ring * 0.12 - 0.06)); out.push(hslToHex(base.h + o, base.s, l)); } return out; }

  function render() {
    const sw = palette(panel.querySelector("#ct-hex").value, panel.querySelector("#ct-scheme").value, Math.max(2, Math.min(16, +panel.querySelector("#ct-n").value)));
    panel.querySelector("#ct-swatches").innerHTML = sw.map((hex) => `<div style="text-align:center"><div style="width:64px;height:64px;border-radius:10px;background:${hex};box-shadow:0 2px 8px #0006"></div><div class="hint" style="margin-top:5px;font-size:10px">${hex}</div></div>`).join("");
  }
  async function apply() {
    const r = await exec("apply_to_track", { track_index: +panel.querySelector("#ct-trk").value, base_hex: panel.querySelector("#ct-hex").value, scheme: panel.querySelector("#ct-scheme").value });
    panel.querySelector("#ct-info").textContent = r.success ? `Colored ${r.data.colored} clips on ${r.data.track}` : (r.error || "Open in Live with clips on this track");
  }
  ["ct-hex", "ct-scheme", "ct-n"].forEach((id) => panel.querySelector("#" + id).oninput = render);
  panel.querySelector("#ct-apply").onclick = apply;
  render();
};
