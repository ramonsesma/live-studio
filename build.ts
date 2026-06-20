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
  format: "esm",
  external: ["@ableton-extensions/sdk"],
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
