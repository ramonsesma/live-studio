// Session-shared persistent storage. The bridge sets the Set's storageDirectory here at startup;
// module tools (e.g. the API Console) read/write JSON under it without needing the bridge.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let STORAGE_DIR: string | null = null;
export function setStorageDir(dir?: string): void { if (dir && typeof dir === "string") STORAGE_DIR = dir; }
export function getStorageDir(): string { return STORAGE_DIR || join(tmpdir(), "live-studio"); }

function dirFor(sub: string): string { const d = join(getStorageDir(), sub); if (!existsSync(d)) mkdirSync(d, { recursive: true }); return d; }

export function saveJson(sub: string, id: string, obj: any): string { const safe = String(id).replace(/[^a-z0-9_.-]/gi, "_"); const p = join(dirFor(sub), safe + ".json"); writeFileSync(p, JSON.stringify(obj, null, 2)); return p; }
export function loadJson(sub: string, id: string): any | null { try { const safe = String(id).replace(/[^a-z0-9_.-]/gi, "_"); const p = join(dirFor(sub), safe + ".json"); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; } catch { return null; } }
export function listJson(sub: string): any[] { try { return readdirSync(dirFor(sub)).filter((f) => f.endsWith(".json")).map((f) => { try { return { id: f.replace(/\.json$/, ""), ...JSON.parse(readFileSync(join(dirFor(sub), f), "utf8")) }; } catch { return null; } }).filter(Boolean); } catch { return []; } }
export function deleteJson(sub: string, id: string): boolean { try { const safe = String(id).replace(/[^a-z0-9_.-]/gi, "_"); const p = join(dirFor(sub), safe + ".json"); if (existsSync(p)) { unlinkSync(p); return true; } return false; } catch { return false; } }
