#!/usr/bin/env python3
"""Verify live-studio.ablx is installable by Ableton Live before it is shipped.

Catches the three install/load failures we hit during the beta:
  1. Non-strict manifest `version` (e.g. 1.0.0-beta.0) -> "No manifest.json found".
  2. ESM entry (top-level import/export) -> "Cannot use import statement outside a module".
  3. SDK left external (require of @ableton-extensions/sdk) -> "Cannot find module".
Plus: manifest at archive root, entry present, and no zip data descriptors (minizip).
"""
import json
import re
import sys
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

print(
    f"verify-ablx: OK — {len(names)} entries, version {m['version']}, "
    f"manifest@root, CJS entry, SDK bundled, no data descriptors"
)
