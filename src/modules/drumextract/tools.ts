// Módulo: Drum Extract — splits a Drum Rack's ACTIVE pads (pads whose note actually appears
// in the clip) onto separate real MIDI tracks, one per pad. Additive: creates tracks/clips.
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const h = this.handlers.get(name);
    if (!h) return { success: false, error: `Unknown: ${name}` };
    try { return await h(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

const NN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const GM: Record<number, string> = { 35:"Kick 2", 36:"Kick", 37:"Rim", 38:"Snare", 39:"Clap", 40:"Snare 2", 41:"Tom Lo", 42:"HH Closed", 43:"Tom", 44:"HH Pedal", 45:"Tom Mid", 46:"HH Open", 47:"Tom Hi", 48:"Tom Hi 2", 49:"Crash", 50:"Tom Top", 51:"Ride" };
const padName = (n: number) => GM[n] || `${NN[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"extract_active_pads", description:"Split a Drum Rack's ACTIVE pads (notes that really occur in the clip) onto separate new MIDI tracks — one track + clip per pad", category:"drums", parameters:{ track_index:{type:"number",description:"Track holding the Drum Rack + pattern clip",required:true}, clip_index:{type:"number",description:"Clip slot (default 0)",required:false}, max_pads:{type:"number",description:"Cap on tracks to create (default 16)",required:false} } },
    async (args: any, song: any) => {
      const track = song?.tracks?.[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const rack = (track.devices || []).find((d: any) => Array.isArray(d.chains));
      const clip = track.clipSlots?.[args.clip_index ?? 0]?.clip ?? track.arrangementClips?.[args.clip_index ?? 0];
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"No MIDI clip on that track/slot." };
      const notes = clip.notes;
      if (!notes.length) return { success:false, error:"The clip has no notes." };
      // Pads = distinct pitches in the clip; if a Drum Rack exists, keep only pitches its chains actually receive.
      const rackNotes: Set<number> | null = rack ? new Set((rack.chains || []).map((c: any) => c.receivingNote).filter((n: any) => typeof n === "number")) : null;
      const byPitch = new Map<number, any[]>();
      for (const n of notes) {
        if (rackNotes && !rackNotes.has(n.pitch)) continue;
        if (!byPitch.has(n.pitch)) byPitch.set(n.pitch, []);
        byPitch.get(n.pitch)!.push({ ...n });
      }
      if (!byPitch.size) return { success:false, error: rack ? "None of the clip's notes hit a Drum Rack pad." : "No notes to extract." };
      const cap = Math.max(1, Math.min(32, args.max_pads ?? 16));
      const span = Math.max(4, ...notes.map((n: any) => n.startTime + (n.duration || 0)));
      const created: any[] = [];
      const inactivePads = rackNotes ? [...rackNotes].filter((p) => !byPitch.has(p)).length : 0;
      const pitches = [...byPitch.keys()].sort((a, b) => a - b).slice(0, cap);
      for (const p of pitches) {
        const nt = await song.createMidiTrack();
        nt.name = `${track.name} · ${padName(p)}`;
        const nc = await nt.createMidiClip(0, span);
        nc.name = padName(p);
        nc.notes = byPitch.get(p)!;
        created.push({ pad: padName(p), pitch: p, hits: byPitch.get(p)!.length, trackIndex: song.tracks.indexOf(nt) });
      }
      return { success:true, data:{ extracted:true, sourceTrack:track.name, rackFound:!!rack, padsExtracted:created.length, inactivePadsSkipped:inactivePads, tracks:created } };
    }
  );

  return reg;
}
