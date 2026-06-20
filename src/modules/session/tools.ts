// Módulo: Sesión & Pistas (control base) — API SDK verificada desde ableton-live-ai/tools.ts
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

function trackOrThrow(song: any, index: number) {
  const t = song.tracks[index];
  if (!t) throw new Error(`Track ${index} not found`);
  return t;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_session_info", description:"Get comprehensive session info: tempo, scale, track/scene counts.", category:"session", parameters:{} },
    async (_a: any, song: any) => ({ success:true, data:{
      tempo: song.tempo,
      gridQuantization: song.gridQuantization, gridIsTriplet: song.gridIsTriplet,
      tracks: song.tracks.length, returnTracks: song.returnTracks.length, scenes: song.scenes.length,
      rootNote: song.rootNote, scaleName: song.scaleName, scaleMode: song.scaleMode,
    } })
  );

  reg.register({ name:"get_all_tracks", description:"Get all tracks with state summary.", category:"tracks", parameters:{} },
    async (_a: any, song: any) => ({ success:true, data:{
      tracks: song.tracks.map((t: any, i: number) => ({ index:i, name:t.name, type:t.constructor.name, solo:t.solo, mute:t.mute, armed:t.arm, clipCount:t.arrangementClips.length, deviceCount:t.devices.length })),
      returnTracks: song.returnTracks.map((rt: any, i: number) => ({ index:i, name:rt.name })),
    } })
  );

  reg.register({ name:"set_tempo", description:"Set tempo in BPM (20-999).", category:"session", parameters:{ tempo:{type:"number",description:"BPM value",required:true} } },
    async (args: any, song: any) => { song.tempo = args.tempo; return { success:true, data:{ tempo: song.tempo } }; }
  );

  reg.register({ name:"create_midi_track", description:"Create a MIDI track.", category:"tracks", parameters:{ name:{type:"string",description:"Track name",required:false} } },
    async (args: any, song: any) => { const track = await song.createMidiTrack(); if (args.name) track.name = args.name; return { success:true, data:{ trackIndex: song.tracks.indexOf(track), name: track.name } }; }
  );

  reg.register({ name:"create_audio_track", description:"Create an audio track.", category:"tracks", parameters:{ name:{type:"string",description:"Track name",required:false} } },
    async (args: any, song: any) => { const track = await song.createAudioTrack(); if (args.name) track.name = args.name; return { success:true, data:{ trackIndex: song.tracks.indexOf(track), name: track.name } }; }
  );

  reg.register({ name:"rename_track", description:"Rename a track.", category:"tracks", parameters:{ track_index:{type:"number",description:"Track index",required:true}, name:{type:"string",description:"New name",required:true} } },
    async (args: any, song: any) => { const t = trackOrThrow(song, args.track_index); t.name = args.name; return { success:true, data:{ name: t.name } }; }
  );

  reg.register({ name:"set_track_solo", description:"Set track solo on/off.", category:"tracks", parameters:{ track_index:{type:"number",description:"Track index",required:true}, solo:{type:"boolean",description:"Solo on/off",required:true} } },
    async (args: any, song: any) => { const t = trackOrThrow(song, args.track_index); t.solo = args.solo; return { success:true, data:{ index:args.track_index, solo: t.solo } }; }
  );

  reg.register({ name:"set_track_mute", description:"Set track mute on/off.", category:"tracks", parameters:{ track_index:{type:"number",description:"Track index",required:true}, mute:{type:"boolean",description:"Mute on/off",required:true} } },
    async (args: any, song: any) => { const t = trackOrThrow(song, args.track_index); t.mute = args.mute; return { success:true, data:{ index:args.track_index, mute: t.mute } }; }
  );

  reg.register({ name:"set_track_arm", description:"Set track record arm on/off.", category:"tracks", parameters:{ track_index:{type:"number",description:"Track index",required:true}, arm:{type:"boolean",description:"Arm on/off",required:true} } },
    async (args: any, song: any) => { const t = trackOrThrow(song, args.track_index); t.arm = args.arm; return { success:true, data:{ index:args.track_index, armed: t.arm } }; }
  );

  return reg;
}
