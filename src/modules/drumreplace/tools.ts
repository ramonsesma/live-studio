// Módulo: Drum Replacer — the SDK has no per-note audio-triggering/Simpler-mapping API, so a true
// "replace this drum hit's sample" isn't possible. What IS real and useful: extracting the exact
// hit timings of one drum type from an existing clip onto a new MIDI track, so the user can point
// a different drum instrument (kit/Simpler) at those real hits instead of a fabricated pattern.
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

const DRUM_KITS: any[] = [
  { name:"Acoustic Kit", samples:["Kick","Snare","Hi-Hat","Tom","Crash","Ride"] },
  { name:"Electronic Kit", samples:["808 Kick","909 Snare","Clap","Hi-Hat","Open Hat","Rim"] },
  { name:"Processed Kit", samples:["Thump","Crack","Sizzle","Boom","Punch","Tone"] }
];
// GM-ish pitch ranges used to identify a drum type inside an existing clip's real notes.
const DRUM_RANGES: Record<string, [number, number]> = { kick:[35,36], snare:[37,40], "hi-hat":[42,46], tom:[41,50] };

function matchingNotes(clip: any, drumType: string) {
  const notes = clip.notes || [];
  if (drumType === "all") return notes;
  const range = DRUM_RANGES[drumType];
  if (!range) return [];
  return notes.filter((n: any) => n.pitch >= range[0] && n.pitch <= range[1]);
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"replace_drum", description:"Extract a drum type's real hit timings from an existing clip onto a new MIDI track (advisory — actual sample/audio replacement isn't possible via the SDK; point a different instrument at the new track)", category:"drum-replace", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, drum_type:{type:"string",description:"Drum type to replace",required:true,enum:["kick","snare","hi-hat","tom","all"]}, sample_index:{type:"number",description:"Suggested sample kit index",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index];
      const clip = track?.clipSlots?.[args.clip_index]?.clip ?? track?.arrangementClips?.[args.clip_index];
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"MIDI clip not found" };
      const hits = matchingNotes(clip, args.drum_type);
      if (!hits.length) return { success:false, error:`No ${args.drum_type} hits found in that clip.` };
      const midiTrack = await song.createMidiTrack();
      midiTrack.name = `Replaced: ${args.drum_type}`;
      const newClip = await midiTrack.createMidiClip(0, clip.duration || 4);
      newClip.name = midiTrack.name;
      newClip.notes = hits.map((n: any) => ({ ...n }));
      return { success:true, data:{ advisory:true, note:"The real hit timings were copied to a new track — load a different drum instrument on it to actually hear the replacement; the SDK can't swap the sample in place.", extracted:true, drumType:args.drum_type, suggestedKit:DRUM_KITS[args.sample_index||0].name, midiTrackIndex:song.tracks.indexOf(midiTrack), hitCount:hits.length } };
    }
  );

  reg.register({ name:"get_kits", description:"List available drum replacement kits", category:"drum-replace", parameters:{} },
    async () => ({ success:true, data:{ kits:DRUM_KITS } })
  );

  reg.register({ name:"create_layer", description:"Copy a drum type's real hit timings to a new MIDI track to layer under the original (advisory — mixing the two audibly needs a real sample on the new track)", category:"drum-replace", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, drum_type:{type:"string",description:"Drum type",required:true,enum:["kick","snare","hi-hat","tom"]}, level:{type:"number",description:"Suggested layer level dB (advisory)",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index];
      const clip = track?.clipSlots?.[args.clip_index]?.clip ?? track?.arrangementClips?.[args.clip_index];
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"MIDI clip not found" };
      const hits = matchingNotes(clip, args.drum_type);
      if (!hits.length) return { success:false, error:`No ${args.drum_type} hits found in that clip.` };
      const layerTrack = await song.createMidiTrack();
      layerTrack.name = `Layer: ${args.drum_type}`;
      const newClip = await layerTrack.createMidiClip(0, clip.duration || 4);
      newClip.name = layerTrack.name;
      newClip.notes = hits.map((n: any) => ({ ...n }));
      if (layerTrack.mixer?.volume && typeof args.level === "number") await layerTrack.mixer.volume.setValue(Math.max(0, Math.min(1, 0.85 + args.level / 40)));
      return { success:true, data:{ layered:true, drumType:args.drum_type, hitCount:hits.length, layerTrackIndex:song.tracks.indexOf(layerTrack), suggestedLevel:args.level??-6 } };
    }
  );

  return reg;
}
