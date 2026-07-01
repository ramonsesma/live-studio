// Módulo: SFX & Texturas — reutilizado de examples/sound-effect-generator
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown: ${name}` };
    try { return await handler(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

const SFX_CATEGORIES: any = {
  nature:    { name:"Nature",    sounds:["rain","wind","thunder","ocean","birds","forest","fire","water"] },
  urban:     { name:"Urban",     sounds:["traffic","siren","footsteps","door","crowd","train","subway","construction"] },
  sci_fi:    { name:"Sci-Fi",    sounds:["laser","warp","beep","alarm","robot","computer","explosion","buzz"] },
  cinematic: { name:"Cinematic", sounds:["whoosh","impact","rise","fall","dron","rumble","hit","swish"] },
  foley:     { name:"Foley",     sounds:["steps","cloth","paper","glass","metal","wood","plastic","food"] },
  musical:   { name:"Musical",   sounds:["bell","chime","gliss","arp","pad","bass","noise","click"] }
};


// Collect notes into a buffer, then write clip.notes ONCE. The real MidiClip setter
// replaces the whole list, so writing note-by-note only kept the last note in Live.
function addNote(buf: any[], pitch: number, startTime: number, duration: number, velocity: number, _prob?: number) {
  buf.push({ pitch, startTime, duration, velocity: Math.max(1, Math.min(127, Math.round(velocity))) });
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_categories", description:"Get SFX categories and available sounds", category:"sfx", parameters:{} },
    async () => ({ success:true, data:{ categories:SFX_CATEGORIES } })
  );

  reg.register({ name:"generate_sfx", description:"Generate a sound effect on a track", category:"sfx", parameters:{ category:{type:"string",description:"Category",required:true,enum:Object.keys(SFX_CATEGORIES)}, sound:{type:"string",description:"Sound name",required:true}, duration:{type:"number",description:"Duration in beats",required:false}, track_index:{type:"number",description:"Track",required:false} } },
    async (args: any, song: any) => {
      const category = SFX_CATEGORIES[args.category];
      if (!category) return { success:false, error:`Unknown category: ${args.category}` };
      if (!category.sounds.includes(args.sound)) return { success:false, error:`Unknown sound: ${args.sound} in ${args.category}` };
      const duration = args.duration || 2;
      const trackIdx = args.track_index;
      const track = trackIdx !== undefined ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx === undefined) { track.name = `SFX ${args.category}`; }
      const clip = await track.createMidiClip(0, duration);
      clip.name = `${args.sound} SFX`;
      const notes: any[] = [];
      addNote(notes, 60, 0, duration * 0.1, 100, 0);
      if (duration > 1) addNote(notes, 64, 0.5, duration * 0.1, 80, 0);
      clip.notes = notes;
      return { success:true, data:{ category:args.category, sound:args.sound, duration, trackIndex:song.tracks.indexOf(track), clipName:clip.name } };
    }
  );

  reg.register({ name:"create_ambient_texture", description:"Create ambient texture", category:"sfx", parameters:{ type:{type:"string",description:"Texture type",required:true,enum:["drone","pad","noise","evolving","granular"]}, track_index:{type:"number",description:"Track",required:false}, bars:{type:"number",description:"Duration in bars",required:false} } },
    async (args: any, song: any) => {
      const bars = args.bars || 8;
      const trackIdx = args.track_index;
      const track = trackIdx !== undefined ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx === undefined) { track.name = `${args.type} Texture`; }
      const clip = await track.createMidiClip(0, bars * 4);
      clip.name = `${args.type} Texture ${bars} bars`;
      const notes: any[] = [];
      for (let i = 0; i < bars * 4; i += 2) {
        addNote(notes, 36 + Math.floor(Math.random()*12), i, 2, 40 + Math.random()*30, 0);
      }
      clip.notes = notes;
      return { success:true, data:{ type:args.type, bars, trackIndex:song.tracks.indexOf(track), notes:notes.length } };
    }
  );

  reg.register({ name:"add_automation", description:"Add parameter automation to SFX track (advisory — the SDK has no arrangement-automation write API to draw a curve over time)", category:"sfx", parameters:{ track_index:{type:"number",description:"Track",required:true}, parameter:{type:"string",description:"Parameter",required:true,enum:["volume","pan","pitch","filter"]}, curve:{type:"string",description:"Automation curve",required:false,enum:["linear","exponential","logarithmic","sine","random"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      return { success:true, data:{ advisory:true, note:"The SDK can only set a parameter's current value, not draw a time-varying automation curve — this can't be applied. Draw it by hand in Live's automation lane.", parameter:args.parameter, curve:args.curve||"linear", trackIndex:args.track_index } };
    }
  );

  return reg;
}
