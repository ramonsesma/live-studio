// Módulo: Drum Map Editor — DrumChain.receivingNote IS settable, so set_drum_mapping really
// remaps a pad. Chain has no name/color property (advisory for those two). ChainMixer has no
// output-routing property at all, and there's no API to load a drum-map preset file — both advisory.
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

const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const GM_DRUM_MAP: any = { 36:"Kick", 38:"Snare", 42:"Closed Hi-Hat", 46:"Open Hi-Hat", 39:"Clap", 41:"Floor Tom", 43:"High Tom", 45:"Mid Tom", 47:"Low Tom", 49:"Crash", 51:"Ride", 56:"Cowbell", 76:"Hi Conga", 77:"Mid Conga", 78:"Low Conga" };
const PAD_COLORS = ["#ff6b6b","#ffb347","#6cc6ff","#5ad17a","#b07cff","#ff8fcf","#7cf0d8","#ffd36c"];
const noteName = (n: number) => `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 2}`;

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_drum_rack", description:"Get drum rack info from a track", category:"drum-map", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      // Find a Drum Rack among the track's real devices and read its pad chains.
      const rack = (track.devices || []).find((d: any) => d?.constructor?.name === "DrumRack" || /drum\s*rack/i.test(d?.name || ""));
      if (!rack) return { success:false, error:"No Drum Rack on this track" };
      const chains = rack.chains || [];
      const pads = chains.map((c: any, i: number) => {
        const note = typeof c?.receivingNote === "number" ? c.receivingNote : 36 + i;
        return {
          index:i, note, noteName:noteName(note),
          name:c?.name || GM_DRUM_MAP[note] || noteName(note),
          color:PAD_COLORS[i % PAD_COLORS.length], deviceCount:(c?.devices || []).length,
        };
      });
      return { success:true, data:{ trackName:track.name, deviceName:rack.name, padCount:pads.length, pads } };
    }
  );

  reg.register({ name:"set_drum_mapping", description:"Retune a drum pad's real MIDI note (DrumChain.receivingNote — undoable); name/color are advisory since Chain has neither property", category:"drum-map", parameters:{ track_index:{type:"number",description:"Track index",required:true}, pad_index:{type:"number",description:"Pad index",required:true}, note:{type:"number",description:"MIDI note number (0-127)",required:true}, name:{type:"string",description:"Pad display name (advisory — Chain has no name property)",required:false}, color:{type:"string",description:"Pad color hex (advisory — Chain has no color property)",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index];
      const rack = (track?.devices || []).find((d: any) => d?.constructor?.name === "DrumRack" || /drum\s*rack/i.test(d?.name || ""));
      if (!rack) return { success:false, error:"No Drum Rack on this track" };
      const chain = rack.chains?.[args.pad_index];
      if (!chain) return { success:false, error:`Pad ${args.pad_index} not found` };
      const before = chain.receivingNote;
      chain.receivingNote = args.note;
      const extra = (args.name || args.color) ? { advisory:true, note:"Chain has no name/color property in the SDK — only the note mapping was actually changed." } : {};
      return { success:true, data:{ mapped:true, trackIndex:args.track_index, padIndex:args.pad_index, previousNote:before, newNote:args.note, noteName:noteName(args.note), ...extra } };
    }
  );

  reg.register({ name:"set_output_routing", description:"Route a drum pad to a specific output channel (advisory — ChainMixer exposes no output-routing property in the SDK)", category:"drum-map", parameters:{ track_index:{type:"number",description:"Track index",required:true}, pad_index:{type:"number",description:"Pad index",required:true}, output:{type:"string",description:"Output routing",required:true,enum:["master","sends-only","ext-out-1","ext-out-2","ext-out-3","ext-out-4"]} } },
    async (args: any) => ({ success:true, data:{ advisory:true, note:"ChainMixer only exposes volume/panning/sends — output routing isn't settable via the SDK. Set it from the chain's I/O row in Live.", output:args.output, trackIndex:args.track_index, padIndex:args.pad_index } })
  );

  reg.register({ name:"load_drum_map_preset", description:"Load a standard drum map preset (advisory — the SDK has no API to load a drum-rack preset file)", category:"drum-map", parameters:{ preset:{type:"string",description:"Drum map preset",required:true,enum:["GM Standard","Ableton Core","808 Kit","909 Kit","Acoustic","Electronic","Custom"]} } },
    async (args: any) => ({ success:true, data:{ advisory:true, note:"There's no API to load a .adg drum-rack preset — drop one onto the track in Live, then use drum-map__set_drum_mapping to retune individual pads.", preset:args.preset } })
  );

  
  return reg;
}
