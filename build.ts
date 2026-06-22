import * as esbuild from "esbuild";
import { cpSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [join(__dirname, "src/extension.ts")],
  bundle: true,
  outfile: join(__dirname, "dist/extension.js"),
  platform: "node",
  target: "es2022",
  // The Live Extension Host loads the entry as CommonJS (the .ablx ships no
  // package.json, so there is no "type":"module" marker). An ESM bundle fails at
  // load time with "Cannot use import statement outside a module". The SDK's own
  // auto-generated build script uses cjs — match it.
  format: "cjs",
  // Do NOT mark @ableton-extensions/sdk external: the Live Extension Host does not
  // resolve node_modules at runtime, so the SDK must be bundled into the entry.
  // Leaving it external produced "Cannot find module '@ableton-extensions/sdk'" at
  // load time. The SDK is pure JS, so esbuild inlines it cleanly.
  // server.ts derives __dirname from import.meta.url, which is invalid in CJS.
  // Shim it from __filename so the bundle resolves the UI folder at runtime.
  define: { "import.meta.url": "importMetaUrl" },
  banner: { js: "const importMetaUrl = require('url').pathToFileURL(__filename).href;" },
  sourcemap: true,
  minify: false,
});

// Copy public UI files to dist/ui (served by the server)
const publicDir = join(__dirname, "public");
const distDir = join(__dirname, "dist/ui");
if (existsSync(publicDir)) {
  cpSync(publicDir, distDir, { recursive: true });
}

console.error("[build] live-studio dist/extension.js ready");
