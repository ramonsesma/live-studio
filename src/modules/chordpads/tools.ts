// Módulo: Chord Pads — the pad grid is this extension's own UI concept (there's no Live API for
// physical/virtual pad hardware), so pad assignments and layout/velocity preferences are real
// extension state — now persisted (src/core/storage.ts) instead of lost on every restart.
import { saveJson, loadJson } from "../../core/storage.js";
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

const CHORD_LIB: any = {
  major: { intervals:[0,4,7], name:"Major" },
  minor: { intervals:[0,3,7], name:"Minor" },
  dim: { intervals:[0,3,6], name:"Diminished" },
  aug: { intervals:[0,4,8], name:"Augmented" },
  sus2: { intervals:[0,2,7], name:"Sus2" },
  sus4: { intervals:[0,5,7], name:"Sus4" },
  maj7: { intervals:[0,4,7,11], name:"Major 7" },
  min7: { intervals:[0,3,7,10], name:"Minor 7" },
  dom7: { intervals:[0,4,7,10], name:"Dominant 7" },
  dim7: { intervals:[0,3,6,9], name:"Diminished 7" }
};
const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const SUB = "chord_pads";
const PADS_ID = "pads", PREFS_ID = "prefs";

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_chords", description:"Get available chord types", category:"chord-pads", parameters:{} },
    async () => ({ success:true, data:{ chords:Object.entries(CHORD_LIB).map(([k,v]: any)=>({ name:k, description:v.name, intervals:v.intervals })) } })
  );

  reg.register({ name:"set_pad", description:"Assign a chord to a pad (persists to disk)", category:"chord-pads", parameters:{ pad_index:{type:"number",description:"Pad index 0-15",required:true}, root:{type:"string",description:"Root note",required:true,enum:NOTES}, chord_type:{type:"string",description:"Chord type",required:true,enum:Object.keys(CHORD_LIB)}, octave:{type:"number",description:"Octave (-2 to 2)",required:false} } },
    async (args: any) => {
      const rootIdx = NOTES.indexOf(args.root);
      const lib = CHORD_LIB[args.chord_type];
      if (rootIdx < 0 || !lib) return { success:false, error:`Unknown root or chord type` };
      const base = 48 + rootIdx + (args.octave || 0) * 12;
      const notes = lib.intervals.map((iv: number) => base + iv);
      const chord = `${args.root} ${lib.name}`;
      const pads = loadJson(SUB, PADS_ID) || {};
      pads[args.pad_index] = { chord, notes };
      saveJson(SUB, PADS_ID, pads);
      return { success:true, data:{ padAssigned:true, pad:args.pad_index, chord, notes } };
    }
  );

  reg.register({ name:"trigger_pad", description:"Drop the pad's chord as a MIDI clip on a new track", category:"chord-pads", parameters:{ pad_index:{type:"number",description:"Pad index to trigger",required:true}, velocity:{type:"number",description:"Velocity 0-127",required:false} } },
    async (args: any, song: any) => {
      const pads = loadJson(SUB, PADS_ID) || {};
      const st = pads[args.pad_index];
      if (!st) return { success:false, error:`Pad ${args.pad_index} is empty — assign a chord first` };
      const prefs = loadJson(SUB, PREFS_ID) || {};
      const velocity = args.velocity || (prefs.fixedVelocity ? prefs.fixedVelocityValue : 100);
      const track = await song.createMidiTrack();
      track.name = `Chord: ${st.chord}`;
      const clip = await track.createMidiClip(0, 4);
      clip.name = st.chord;
      clip.notes = st.notes.map((p: number) => ({ pitch:p, startTime:0, duration:4, velocity }));
      return { success:true, data:{ triggered:true, pad:args.pad_index, chord:st.chord, notesPlayed:st.notes.length, trackIndex:song.tracks.indexOf(track) } };
    }
  );

  reg.register({ name:"set_layout", description:"Set pad layout grid size (persists to disk — this is the extension's own UI grid, not a Live setting)", category:"chord-pads", parameters:{ layout:{type:"string",description:"Pad grid layout",required:false,enum:["4x4","2x8","1x16","8x2"]}, label_mode:{type:"string",description:"Pad label mode",required:false,enum:["chord","root","roman","none"]} } },
    async (args: any) => {
      const prefs = loadJson(SUB, PREFS_ID) || {};
      if (args.layout) prefs.layout = args.layout;
      if (args.label_mode) prefs.labelMode = args.label_mode;
      saveJson(SUB, PREFS_ID, prefs);
      return { success:true, data:{ layoutSet:true, layout:prefs.layout||"4x4", labelMode:prefs.labelMode||"chord" } };
    }
  );

  reg.register({ name:"set_fixed_velocity", description:"Enable fixed velocity for chord pads (persists to disk; applied the next time a pad is triggered)", category:"chord-pads", parameters:{ enabled:{type:"boolean",description:"Fixed velocity on/off",required:false}, velocity:{type:"number",description:"Fixed velocity value",required:false} } },
    async (args: any) => {
      const prefs = loadJson(SUB, PREFS_ID) || {};
      prefs.fixedVelocity = args.enabled !== false;
      prefs.fixedVelocityValue = args.velocity || prefs.fixedVelocityValue || 100;
      saveJson(SUB, PREFS_ID, prefs);
      return { success:true, data:{ fixedVelocity:prefs.fixedVelocity, value:prefs.fixedVelocityValue } };
    }
  );

  return reg;
}
