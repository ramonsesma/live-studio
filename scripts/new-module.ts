// Scaffolds a new Live Studio module in one command:
//   npm run new:module -- <id> "<Label>" [icon] ["description"]
// e.g. npm run new:module -- swing "Swing Doctor" 🎷 "Analyzes and fixes swing feel."
//
// It creates src/modules/<id>/tools.ts and public/panels/<id>.js, registers the module in
// src/registry/index.ts, adds the panel <script> tag to public/index.html, and extends
// test/smoke.ts (allPanels + EXPECTED_MODULES) so the suite still guards the real counts.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const [id, label, icon = "🧩", description = ""] = process.argv.slice(2);

function die(msg: string): never { console.error(`[new:module] ${msg}`); process.exit(1); }

if (!id || !label) die('Usage: npm run new:module -- <id> "<Label>" [icon] ["description"]');
if (!/^[a-z][a-z0-9]{1,30}$/.test(id)) die(`Invalid id "${id}" — lowercase letters/digits, starting with a letter.`);

const modDir = join(root, "src/modules", id);
const panelFile = join(root, "public/panels", `${id}.js`);
const registryFile = join(root, "src/registry/index.ts");
const smokeFile = join(root, "test/smoke.ts");

if (existsSync(modDir)) die(`src/modules/${id} already exists.`);
if (existsSync(panelFile)) die(`public/panels/${id}.js already exists.`);
const registrySrc = readFileSync(registryFile, "utf8");
if (registrySrc.includes(`id:"${id}"`)) die(`Module "${id}" is already registered in src/registry/index.ts.`);

const alias = `${id}Tools`;
const descEsc = (description || `${label} module.`).replace(/"/g, '\\"');
const labelEsc = label.replace(/"/g, '\\"');

// ---- 1. src/modules/<id>/tools.ts ----
const toolsTs = `// Módulo: ${label}
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const h = this.handlers.get(name);
    if (!h) return { success: false, error: \`Unknown: \${name}\` };
    try { return await h(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  // Example tool — reads REAL state from the song. Replace/extend it, but keep the honesty
  // rule: if a capability can't truly execute against the SDK, return advisory:true and say so.
  reg.register({ name:"get_status", description:"Report ${labelEsc}'s view of the current Set (real track/scene counts and tempo)", category:"${id}", parameters:{} },
    async (_args: any, song: any) => ({
      success: true,
      data: {
        tempo: song?.tempo ?? null,
        tracks: (song?.tracks || []).length,
        scenes: (song?.scenes || []).length,
      },
    })
  );

  return reg;
}
`;

// ---- 2. public/panels/<id>.js ----
const panelJs = `// Rich panel: ${label}
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.${id} = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = \`
    <div class="panel-head"><h1>${icon} ${labelEsc}</h1><p>${descEsc}</p></div>
    <button class="btn ghost" id="${id}-refresh" style="margin-bottom:12px">↻ Refresh</button>
    <div id="${id}-body"><span class="hint">Loading…</span></div>\`;

  async function refresh() {
    const r = await exec("get_status", {});
    const box = panel.querySelector("#${id}-body");
    if (!r.success) { box.innerHTML = \`<span class="hint">\${r.error}</span>\`; return; }
    box.innerHTML = \`<span class="hint">Tempo \${r.data.tempo} · \${r.data.tracks} tracks · \${r.data.scenes} scenes</span>\`;
  }

  panel.querySelector("#${id}-refresh").onclick = refresh;
  if (helpers.onSongChanged) helpers.onSongChanged(() => refresh()); // live refresh via SSE
  refresh();
};
`;

// ---- 3. register in src/registry/index.ts ----
const importLine = `import { createToolRegistry as ${alias} } from "../modules/${id}/tools.js";`;
const importRe = /^import \{ createToolRegistry as .+ \} from "\.\.\/modules\/.+\/tools\.js";$/gm;
let lastImportEnd = -1;
for (const m of registrySrc.matchAll(importRe)) lastImportEnd = m.index! + m[0].length;
if (lastImportEnd < 0) die("Couldn't find the module import block in src/registry/index.ts.");
let newRegistry = registrySrc.slice(0, lastImportEnd) + "\n" + importLine + registrySrc.slice(lastImportEnd);

const returnAnchor = "\n  return m;";
if (!newRegistry.includes(returnAnchor)) die("Couldn't find `return m;` in createMasterRegistry().");
const addLine = `\n  m.addModule({ id:"${id}", label:"${labelEsc}", icon:"${icon}", description:"${descEsc}", registry: ${alias}() });\n`;
newRegistry = newRegistry.replace(returnAnchor, addLine + returnAnchor);

// ---- 4. test/smoke.ts: allPanels + EXPECTED_MODULES ----
// (public/index.html needs no change — panels load lazily, fetched by module id on first visit.)
const smokeSrc = readFileSync(smokeFile, "utf8");
const panelsMatch = smokeSrc.match(/const allPanels = \[[^\]]*\];/);
if (!panelsMatch) die("Couldn't find allPanels in test/smoke.ts.");
const modulesMatch = smokeSrc.match(/const EXPECTED_MODULES = (\d+);/);
if (!modulesMatch) die("Couldn't find EXPECTED_MODULES in test/smoke.ts.");
let newSmoke = smokeSrc.replace(panelsMatch[0], panelsMatch[0].replace(/\];$/, `, "${id}"];`));
newSmoke = newSmoke.replace(modulesMatch[0], `const EXPECTED_MODULES = ${Number(modulesMatch[1]) + 1};`);

// ---- write everything (only after every anchor was found) ----
mkdirSync(modDir, { recursive: true });
writeFileSync(join(modDir, "tools.ts"), toolsTs);
writeFileSync(panelFile, panelJs);
writeFileSync(registryFile, newRegistry);
writeFileSync(smokeFile, newSmoke);

console.log(`[new:module] Created module "${id}" (${label}):
  + src/modules/${id}/tools.ts          (1 example tool: ${id}__get_status)
  + public/panels/${id}.js              (rich panel with live refresh — loads lazily, no index.html change needed)
  ~ src/registry/index.ts               (import + addModule)
  ~ test/smoke.ts                       (allPanels + EXPECTED_MODULES → ${Number(modulesMatch[1]) + 1})

Next steps:
  1. npm run typecheck && npm run test   — must stay green
  2. Add real tools in src/modules/${id}/tools.ts (advisory:true when the SDK can't truly do it)
  3. Optional: add an icon for "${id}" in public/icons.js (falls back to a default dot)
  4. npm run gen:catalog                 — refresh docs/index.html before publishing`);
