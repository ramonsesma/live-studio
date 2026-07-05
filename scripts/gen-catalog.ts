// Generates docs/catalog.html — a static, searchable catalog of every module and tool,
// built from the SAME registry the extension runs, so it can never drift from reality.
// docs/index.html is the hand-crafted landing page; this catalog is linked from it.
// Publish both with GitHub Pages (Settings → Pages → main /docs). Regenerate any time with:
//   npm run gen:catalog
import { createMasterRegistry } from "../src/registry/index.js";
import { Bridge } from "../src/bridge.js";
import { writeFileSync, mkdirSync, readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const reg = createMasterRegistry();
// The Bridge registers 13 extra tools (audio render, snapshots, mix coach…) on construction —
// without it the catalog would silently under-count the toolset.
new Bridge(reg, {});
const modules = reg.getModules();
const tools = reg.getDefinitionsJson();

// Which modules ship a rich panel? Ground truth = the actual files in public/panels/.
const panelIds = new Set(
  readdirSync(join(root, "public/panels")).filter((f) => f.endsWith(".js")).map((f) => f.replace(/\.js$/, ""))
);

// "advisory" tools are honest about not being fully executable against the SDK beta —
// their descriptions say so. Surfacing that in the catalog is part of the project's ethos.
const isAdvisory = (d: string) => /advisory/i.test(d || "");

const data = modules.filter((m: any) => !m.hidden).map((m: any) => ({
  id: m.id,
  label: m.label,
  icon: m.icon,
  description: m.description,
  panel: panelIds.has(m.id),
  tools: tools.filter((t: any) => t.module === m.id).map((t: any) => ({
    name: t.originalName || t.name,
    fq: t.name,
    description: t.description,
    demo: !!t.demo,
    advisory: isAdvisory(t.description),
    params: Object.entries(t.parameters || {}).map(([k, v]: [string, any]) => ({ name: k, type: v.type, required: !!v.required, description: v.description || "", enum: v.enum })),
  })),
}));

const stats = {
  modules: data.length,
  tools: tools.length,
  panels: data.filter((m) => m.panel).length,
  version: JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Live Studio — Module & Tool Catalog</title>
<style>
:root { --bg:#1a1a1d; --bg2:#232327; --bg3:#2c2c31; --line:#38383f; --txt:#e8e8ea; --muted:#9a9aa2; --accent:#ffb347; --accent2:#6cc6ff; --ok:#5ad17a; }
* { box-sizing:border-box; }
body { margin:0; font-family:-apple-system,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--txt); font-size:14px; }
header { padding:34px 24px 20px; max-width:1080px; margin:0 auto; }
h1 { margin:0 0 6px; font-size:26px; }
h1 .v { font-size:13px; color:var(--muted); font-weight:400; margin-left:8px; }
.sub { color:var(--muted); margin:0 0 16px; }
.stats { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
.stat { background:var(--bg2); border:1px solid var(--line); border-radius:10px; padding:8px 16px; }
.stat b { font-size:18px; }
.stat span { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-left:6px; }
.controls { display:flex; gap:10px; flex-wrap:wrap; }
input[type=search] { flex:1; min-width:220px; background:var(--bg2); border:1px solid var(--line); color:var(--txt); border-radius:9px; padding:10px 14px; font-size:14px; }
label.flt { display:inline-flex; align-items:center; gap:6px; color:var(--muted); font-size:12.5px; background:var(--bg2); border:1px solid var(--line); border-radius:9px; padding:0 12px; cursor:pointer; }
main { max-width:1080px; margin:0 auto; padding:0 24px 60px; }
.mod { background:var(--bg2); border:1px solid var(--line); border-radius:12px; margin-bottom:14px; overflow:hidden; }
.mod-head { display:flex; align-items:baseline; gap:10px; padding:14px 18px; cursor:pointer; flex-wrap:wrap; }
.mod-head:hover { background:var(--bg3); }
.mod-head h2 { margin:0; font-size:16px; }
.mod-head .id { color:var(--muted); font-size:12px; font-family:ui-monospace,monospace; }
.mod-head .desc { flex-basis:100%; color:var(--muted); font-size:12.5px; margin-top:2px; }
.badge { font-size:10px; text-transform:uppercase; letter-spacing:1px; border-radius:5px; padding:2px 7px; border:1px solid var(--line); }
.badge.panel { color:var(--ok); border-color:var(--ok); }
.badge.demo { color:var(--accent); border-color:var(--accent); }
.badge.advisory { color:var(--accent2); border-color:var(--accent2); }
.badge.n { color:var(--muted); }
.tools { display:none; border-top:1px solid var(--line); }
.mod.open .tools { display:block; }
.tool { padding:12px 18px; border-top:1px solid var(--line); }
.tool:first-child { border-top:none; }
.tool h3 { margin:0 0 3px; font-size:13.5px; font-family:ui-monospace,monospace; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.tool p { margin:0 0 6px; color:var(--muted); font-size:12.5px; }
.params { font-size:12px; color:var(--muted); }
.params code { background:var(--bg3); border-radius:4px; padding:1px 5px; font-size:11.5px; }
.params .req { color:var(--accent); }
.empty { color:var(--muted); text-align:center; padding:40px 0; }
footer { max-width:1080px; margin:0 auto; padding:14px 24px 40px; color:var(--muted); font-size:12px; border-top:1px solid var(--line); }
mark { background:var(--accent); color:#1a1a1d; border-radius:3px; padding:0 2px; }
</style>
</head>
<body>
<header>
  <p style="margin:0 0 10px"><a href="./" style="color:var(--muted);text-decoration:none;font-size:13px">← Live Studio</a></p>
  <h1>Live Studio<span class="v">v${stats.version} · catalog</span></h1>
  <p class="sub">Every module and tool in the extension — generated from the real registry, never hand-written.</p>
  <div class="stats">
    <div class="stat"><b>${stats.modules}</b><span>modules</span></div>
    <div class="stat"><b>${stats.tools}</b><span>tools</span></div>
    <div class="stat"><b>${stats.panels}</b><span>rich panels</span></div>
  </div>
  <div class="controls">
    <input type="search" id="q" placeholder="Search modules and tools… (name, description, parameter)" autocomplete="off" />
    <label class="flt"><input type="checkbox" id="f-panel" /> rich panel only</label>
    <label class="flt"><input type="checkbox" id="f-real" /> hide demo/advisory</label>
    <button class="flt" id="toggle-all" type="button" style="cursor:pointer">Collapse all</button>
  </div>
</header>
<main id="list"></main>
<footer>Generated by <code>npm run gen:catalog</code> · <a href="https://github.com/ramonsesma/live-studio" style="color:var(--accent2)">github.com/ramonsesma/live-studio</a> · GPL-3.0-or-later</footer>
<script>
const DATA = ${JSON.stringify(data)};
const list = document.getElementById("list");
const q = document.getElementById("q");
const fPanel = document.getElementById("f-panel");
const fReal = document.getElementById("f-real");
const toggleAll = document.getElementById("toggle-all");
// Every module renders expanded by default — this page's whole purpose is "browse the
// tools", so landing on a wall of collapsed accordions with no tool visible defeats that.
// allOpen persists across re-renders (search/filter) until the user explicitly collapses.
let allOpen = true;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function hl(s, term) { if (!term) return esc(s); const i = s.toLowerCase().indexOf(term); if (i < 0) return esc(s); return esc(s.slice(0, i)) + "<mark>" + esc(s.slice(i, i + term.length)) + "</mark>" + esc(s.slice(i + term.length)); }
function render() {
  const term = q.value.trim().toLowerCase();
  list.innerHTML = "";
  let shown = 0;
  for (const m of DATA) {
    if (fPanel.checked && !m.panel) continue;
    let tools = m.tools;
    if (fReal.checked) tools = tools.filter((t) => !t.demo && !t.advisory);
    if (term) {
      const modHit = (m.label + " " + m.id + " " + m.description).toLowerCase().includes(term);
      const toolHits = tools.filter((t) => (t.name + " " + t.description + " " + t.params.map((p) => p.name).join(" ")).toLowerCase().includes(term));
      if (!modHit && !toolHits.length) continue;
      if (!modHit) tools = toolHits;
    }
    if (!tools.length && fReal.checked) continue;
    shown++;
    const el = document.createElement("div");
    el.className = "mod" + (allOpen || term ? " open" : "");
    el.innerHTML = \`
      <div class="mod-head">
        <h2>\${esc(m.icon)} \${hl(m.label, term)}</h2>
        <span class="id">\${esc(m.id)}</span>
        \${m.panel ? '<span class="badge panel">rich panel</span>' : ""}
        <span class="badge n">\${tools.length} tools</span>
        <span class="desc">\${hl(m.description, term)}</span>
      </div>
      <div class="tools">\${tools.map((t) => \`
        <div class="tool">
          <h3>\${hl(t.fq, term)}\${t.demo ? ' <span class="badge demo" title="Returns simulated data">demo</span>' : ""}\${t.advisory ? ' <span class="badge advisory" title="Advisory: suggests, cannot fully execute against the SDK beta">advisory</span>' : ""}</h3>
          <p>\${hl(t.description, term)}</p>
          \${t.params.length ? '<div class="params">' + t.params.map((p) => \`<code>\${esc(p.name)}\${p.required ? '<span class="req">*</span>' : ""}: \${esc(p.type)}\${p.enum ? " (" + p.enum.map(esc).join("|") + ")" : ""}</code>\`).join(" ") + "</div>" : ""}
        </div>\`).join("")}</div>\`;
    el.querySelector(".mod-head").onclick = () => el.classList.toggle("open");
    list.appendChild(el);
  }
  if (!shown) list.innerHTML = '<div class="empty">No modules match.</div>';
}
q.oninput = render; fPanel.onchange = render; fReal.onchange = render;
toggleAll.onclick = () => { allOpen = !allOpen; toggleAll.textContent = allOpen ? "Collapse all" : "Expand all"; render(); };
render();
</script>
</body>
</html>
`;

const outDir = join(root, "docs");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "catalog.html"), html);
console.log(`[gen-catalog] docs/catalog.html — ${stats.modules} modules, ${stats.tools} tools, ${stats.panels} rich panels (v${stats.version})`);
