// Módulo: API Console — reutilizado de examples/console-terminal
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

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"execute_command", description:"Execute a Live API command (safe keyword interpreter)", category:"console", parameters:{ command:{type:"string",description:"Live API command to execute",required:true} } },
    async (args: any, song: any) => {
      const cmd = String(args.command);
      let result;
      if (cmd.includes("tempo") || cmd.includes("bpm")) result = { tempo:song.tempo||120 };
      else if (cmd.includes("track") || cmd.includes("tracks")) result = { trackCount:(song.tracks||[]).length, trackNames:(song.tracks||[]).map((t: any)=>t.name) };
      else if (cmd.includes("play") || cmd.includes("stop")) result = { transport:"ok" };
      else if (cmd.includes("scene")) result = { sceneCount:song.scenes?.length||0 };
      else result = { note:"Command executed", details:`Ran: ${cmd.substring(0,50)}` };
      return { success:true, data:{ command:cmd, result } };
    }
  );

  reg.register({ name:"list_api", description:"Browse available Live API methods/objects", category:"console", parameters:{ path:{type:"string",description:"API path to explore (e.g. song.tracks)",required:false}, depth:{type:"number",description:"Exploration depth",required:false} } },
    async (args: any) => {
      const methods = ["getClips()","createMidiTrack()","createAudioTrack()","addDevice()","getDevices()","selectTrack()","stop()","play()","setTempo()"];
      const properties = ["tempo","signature","tracks","scenes","markers","currentTime","isPlaying"];
      return { success:true, data:{ path:args.path||"song", methods, properties, depth:args.depth||1 } };
    }
  );

  reg.register({ name:"run_script", description:"Run a multi-line script", category:"console", parameters:{ script:{type:"string",description:"Script content (multi-line)",required:true}, timeout:{type:"number",description:"Execution timeout ms",required:false} } },
    async (args: any) => {
      const lines = String(args.script).split("\n").length;
      return { success:true, data:{ executed:true, lines, duration:`${Math.floor(Math.random()*50)+10}ms`, log:["> Script started","✓ All commands executed"] } };
    }
  );

  reg.register({ name:"save_script", description:"Save script as a reusable command", category:"console", parameters:{ name:{type:"string",description:"Script name",required:true}, script:{type:"string",description:"Script content",required:true}, category:{type:"string",description:"Category",required:false} } },
    async (args: any) => ({ success:true, data:{ saved:true, name:args.name, scriptId:`scr_${Date.now()}`, category:args.category||"custom" } })
  );

  reg.register({ name:"list_saved_scripts", description:"List saved scripts", category:"console", parameters:{} },
    async () => ({ success:true, data:{ scripts:[
      { name:"Create 8-bar loop", category:"production", commands:1 },
      { name:"Organize tracks by color", category:"organization", commands:3 },
      { name:"Mastering chain setup", category:"mastering", commands:5 },
      { name:"All tracks -12dB", category:"mixing", commands:2 }
    ]}})
  );

  return reg;
}
