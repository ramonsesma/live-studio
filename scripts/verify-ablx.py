#!/usr/bin/env python3
"""Verify live-studio.ablx is installable by Ableton Live before it is shipped.

Catches the load/install failures we hit during the beta:
  1. Non-strict manifest `version` (e.g. 1.0.0-beta.0) -> "No manifest.json found".
  2. ESM entry (top-level import/export) -> "Cannot use import statement outside a module".
  3. SDK left external (require of @ableton-extensions/sdk) -> "Cannot find module".
  4. Entry doesn't export a named `activate` -> "does not export an 'activate' function".
Plus: manifest at archive root, entry present, and no zip data descriptors (minizip).

The `activate` check loads the entry exactly like the host does: from a directory with
NO package.json, so node treats it as CommonJS (the dev project is "type":"module",
which would otherwise mis-parse the bundle as ESM — a false negative).
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import zipfile

ABLX = sys.argv[1] if len(sys.argv) > 1 else "live-studio.ablx"


def fail(msg: str) -> None:
    print(f"verify-ablx: FAIL — {msg}")
    sys.exit(1)


z = zipfile.ZipFile(ABLX)
names = z.namelist()

if "manifest.json" not in names:
    fail("manifest.json is not at the archive root")

m = json.loads(z.read("manifest.json"))

if not re.fullmatch(r"\d+\.\d+\.\d+", m.get("version", "")):
    fail(f"version must be strict MAJOR.MINOR.PATCH, got {m.get('version')!r}")

if m.get("entry") not in names:
    fail(f"entry {m.get('entry')!r} is not inside the archive")

entry = z.read(m["entry"]).decode("utf-8", "replace")
esm = [l for l in entry.splitlines() if l.startswith("import ") or l.startswith("export ")]
if esm:
    fail(f"entry has top-level ESM statements (must be CJS): {esm[:3]}")

if re.search(r"""require\(['"]@ableton-extensions/sdk['"]\)""", entry):
    fail("entry require()s @ableton-extensions/sdk — the SDK must be bundled, not external")

data_desc = [i.filename for i in z.infolist() if i.flag_bits & 0x08]
if data_desc:
    fail(f"zip has data-descriptor entries (minizip can't read): {data_desc[:3]}")

# Functional check: load the entry the way the host does (CJS, no package.json) and
# assert it exports a callable `activate`.
with tempfile.TemporaryDirectory() as tmp:
    entry_path = os.path.join(tmp, "extension.js")
    with open(entry_path, "w", encoding="utf-8") as f:
        f.write(entry)
    probe = (
        "try{const m=require(process.argv[1]);"
        "process.exit(typeof m.activate==='function'?0:3);}"
        "catch(e){console.error(e.message.split('\\n')[0]);process.exit(4);}"
    )
    r = subprocess.run(["node", "-e", probe, entry_path], capture_output=True, text=True)
    if r.returncode == 3:
        fail("entry does not export a named `activate` function (use `export function activate`, not default)")
    elif r.returncode != 0:
        fail(f"entry failed to load as CommonJS: {r.stderr.strip() or r.stdout.strip()}")

print(
    f"verify-ablx: OK — {len(names)} entries, version {m['version']}, "
    f"manifest@root, CJS entry, SDK bundled, exports activate(), no data descriptors"
)
