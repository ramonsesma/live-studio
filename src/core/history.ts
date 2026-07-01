// Shared session-scoped edit history for the whole toolkit. Any destructive (in-place) edit
// records a restore snapshot here BEFORE mutating; the Edit History module exposes undo/redo.
// In-session only (restore closures capture prior values) — cross-restart is Project Snapshot.
//
// Redo works via a self-toggling closure: `restore` doesn't just snapshot "the value before" —
// each time it runs, it first reads whatever is live RIGHT NOW, applies the value it's holding,
// then swaps to hold what it just read. So calling it once undoes, and calling the SAME entry's
// `restore` again (after it's been moved to the redo stack) re-applies the edit. This needs no
// extra state at record time (no "after" value is known until the caller mutates), and no call
// site changes — recordNotes/recordColor/recordParamAt/recordToggle build the closure this way
// internally, so every existing call site gets working redo for free.

type Entry = { id: number; key: string; label: string; ts: number; restore: () => void | Promise<void> };

class EditHistory {
  private stack: Entry[] = [];
  private redoStack: Entry[] = [];
  private seq = 0;
  private cap = 200;

  push(key: string, label: string, restore: () => void | Promise<void>): number {
    const id = ++this.seq;
    this.stack.push({ id, key, label, ts: Date.now(), restore });
    while (this.stack.length > this.cap) this.stack.shift();
    this.redoStack = []; // a fresh edit invalidates whatever redo timeline existed (standard undo/redo semantics)
    return id;
  }
  async undoLast(): Promise<Entry | null> {
    const e = this.stack.pop();
    if (!e) return null;
    try { await e.restore(); } catch { /* best-effort restore */ }
    this.redoStack.push(e);
    return e;
  }
  async undoTarget(key: string): Promise<Entry | null> {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].key === key) {
        const [e] = this.stack.splice(i, 1);
        try { await e.restore(); } catch { /* best-effort */ }
        this.redoStack.push(e);
        return e;
      }
    }
    return null;
  }
  async redoLast(): Promise<Entry | null> {
    const e = this.redoStack.pop();
    if (!e) return null;
    try { await e.restore(); } catch { /* best-effort */ }
    this.stack.push(e);
    return e;
  }
  async redoTarget(key: string): Promise<Entry | null> {
    for (let i = this.redoStack.length - 1; i >= 0; i--) {
      if (this.redoStack[i].key === key) {
        const [e] = this.redoStack.splice(i, 1);
        try { await e.restore(); } catch { /* best-effort */ }
        this.stack.push(e);
        return e;
      }
    }
    return null;
  }
  depth(key?: string): number { return key ? this.stack.filter((e) => e.key === key).length : this.stack.length; }
  redoDepth(key?: string): number { return key ? this.redoStack.filter((e) => e.key === key).length : this.redoStack.length; }
  list(limit = 25): { id: number; key: string; label: string; ts: number }[] {
    return this.stack.slice(-limit).reverse().map((e) => ({ id: e.id, key: e.key, label: e.label, ts: e.ts }));
  }
  listRedo(limit = 25): { id: number; key: string; label: string; ts: number }[] {
    return this.redoStack.slice(-limit).reverse().map((e) => ({ id: e.id, key: e.key, label: e.label, ts: e.ts }));
  }
  clear(key?: string): number {
    const before = this.stack.length;
    this.stack = key ? this.stack.filter((e) => e.key !== key) : [];
    if (!key) this.redoStack = [];
    return before - this.stack.length;
  }
}

// One instance per Extension Host session (Node module caching guarantees a single import).
export const history = new EditHistory();

export const keyClip = (ti: number, ci: number) => `clip:${ti}:${ci}`;
export const keyTrack = (ti: number) => `track:${ti}`;
export const keyDevice = (ti: number, di: number) => `device:${ti}:${di}`;

// Builds a self-toggling restore closure: reads the live value, applies `nextValue`, then swaps
// `nextValue` to what it just read. First call undoes; once the entry is moved to the redo
// stack, calling it again re-applies the edit that was undone.
function toggler(getValue: () => any, setValue: (v: any) => void | Promise<void>, initial: any) {
  let nextValue = initial;
  return async () => {
    const current = await getValue();
    await setValue(nextValue);
    nextValue = current;
  };
}

// One-liners modules call right before a destructive edit.
export function recordNotes(clip: any, ti: number, ci: number, label: string): void {
  if (!clip || !Array.isArray(clip.notes)) return;
  const before = clip.notes.map((n: any) => ({ ...n }));
  const restore = toggler(() => clip.notes.map((n: any) => ({ ...n })), (v) => { clip.notes = v; }, before);
  history.push(keyClip(ti, ci), label, restore);
}
export function recordColor(clip: any, ti: number, ci: number, label: string): void {
  if (!clip) return;
  const before = clip.color;
  const restore = toggler(() => clip.color, (v) => { clip.color = v; }, before);
  history.push(keyClip(ti, ci), label, restore);
}
// Record a parameter (device or mixer) under an explicit key — captures its current value now
// and restores it on undo (and re-applies it on redo). Use keyDevice(...) for device params,
// keyTrack(...) for mixer params.
export async function recordParamAt(param: any, key: string, label: string): Promise<void> {
  if (!param || typeof param.getValue !== "function") return;
  const before = await param.getValue();
  const restore = toggler(() => param.getValue(), (v) => param.setValue(v), before);
  history.push(key, label, restore);
}
export async function recordParam(param: any, ti: number, di: number, label: string): Promise<void> {
  await recordParamAt(param, keyDevice(ti, di), label);
}
// Generic version of the above for any plain get/set pair (track.mute, track.name, song.tempo,
// a Scene's name, ...) — anything simpler than a full parameter object. Same toggle semantics.
export function recordToggle(key: string, label: string, getValue: () => any, setValue: (v: any) => void | Promise<void>): void {
  const before = getValue();
  history.push(key, label, toggler(getValue, setValue, before));
}
