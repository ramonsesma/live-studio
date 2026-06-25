// Shared session-scoped edit history for the whole toolkit. Any destructive (in-place) edit
// records a restore snapshot here BEFORE mutating; the Edit History module exposes undo.
// In-session only (restore closures capture prior values) — cross-restart is Project Snapshot.

type Entry = { id: number; key: string; label: string; ts: number; restore: () => void | Promise<void> };

class EditHistory {
  private stack: Entry[] = [];
  private seq = 0;
  private cap = 200;

  push(key: string, label: string, restore: () => void | Promise<void>): number {
    const id = ++this.seq;
    this.stack.push({ id, key, label, ts: Date.now(), restore });
    while (this.stack.length > this.cap) this.stack.shift();
    return id;
  }
  async undoLast(): Promise<Entry | null> {
    const e = this.stack.pop();
    if (!e) return null;
    try { await e.restore(); } catch { /* best-effort restore */ }
    return e;
  }
  async undoTarget(key: string): Promise<Entry | null> {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].key === key) {
        const [e] = this.stack.splice(i, 1);
        try { await e.restore(); } catch { /* best-effort */ }
        return e;
      }
    }
    return null;
  }
  depth(key?: string): number { return key ? this.stack.filter((e) => e.key === key).length : this.stack.length; }
  list(limit = 25): { id: number; key: string; label: string; ts: number }[] {
    return this.stack.slice(-limit).reverse().map((e) => ({ id: e.id, key: e.key, label: e.label, ts: e.ts }));
  }
  clear(key?: string): number {
    const before = this.stack.length;
    this.stack = key ? this.stack.filter((e) => e.key !== key) : [];
    return before - this.stack.length;
  }
}

// One instance per Extension Host session (Node module caching guarantees a single import).
export const history = new EditHistory();

export const keyClip = (ti: number, ci: number) => `clip:${ti}:${ci}`;
export const keyTrack = (ti: number) => `track:${ti}`;
export const keyDevice = (ti: number, di: number) => `device:${ti}:${di}`;

// One-liners modules call right before a destructive edit.
export function recordNotes(clip: any, ti: number, ci: number, label: string): void {
  if (!clip || !Array.isArray(clip.notes)) return;
  const prev = clip.notes.map((n: any) => ({ ...n }));
  history.push(keyClip(ti, ci), label, () => { clip.notes = prev; });
}
export function recordColor(clip: any, ti: number, ci: number, label: string): void {
  if (!clip) return;
  const prev = clip.color;
  history.push(keyClip(ti, ci), label, () => { clip.color = prev; });
}
// Record a parameter (device or mixer) under an explicit key — captures its current value now
// and restores it on undo. Use keyDevice(...) for device params, keyTrack(...) for mixer params.
export async function recordParamAt(param: any, key: string, label: string): Promise<void> {
  if (!param || typeof param.getValue !== "function") return;
  const prev = await param.getValue();
  history.push(key, label, async () => { await param.setValue(prev); });
}
export async function recordParam(param: any, ti: number, di: number, label: string): Promise<void> {
  await recordParamAt(param, keyDevice(ti, di), label);
}
