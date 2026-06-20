// Módulo: File Manager — reutilizado de examples/file-manager
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

  reg.register({ name:"get_project_files", description:"List all files used in the project", category:"file-manager", parameters:{} },
    async () => {
      const files = [
        { name:"Kick_808.wav", type:"audio", size:"2.3 MB", path:"/Samples/Kicks/", used:true, inProjectFolder:false },
        { name:"Snare_909.wav", type:"audio", size:"1.8 MB", path:"/Samples/Snares/", used:true, inProjectFolder:false },
        { name:"Bassline.wav", type:"audio", size:"5.1 MB", path:"/Recorded/", used:true, inProjectFolder:true },
        { name:"Vocal_Take1.wav", type:"audio", size:"12.4 MB", path:"/Recorded/", used:true, inProjectFolder:true },
        { name:"Old_sample.wav", type:"audio", size:"3.7 MB", path:"/Samples/Old/", used:false, inProjectFolder:false },
        { name:"Unused_loop.wav", type:"audio", size:"8.2 MB", path:"/Downloads/", used:false, inProjectFolder:false }
      ];
      return { success:true, data:{ totalFiles:files.length, totalSize:`${files.reduce((s,f)=>s+parseFloat(f.size),0)} MB`, usedFiles:files.filter(f=>f.used).length, unusedFiles:files.filter(f=>!f.used).length, externalFiles:files.filter(f=>!f.inProjectFolder).length, files } };
    }
  );

  reg.register({ name:"collect_all", description:"Copy all external files to project folder", category:"file-manager", parameters:{ organize:{type:"boolean",description:"Organize into subfolders by type",required:false} } },
    async () => ({ success:true, data:{ collected:true, filesCopied:3, savedTo:"/Project/Samples/", freedExternalLinks:3, organize:true } })
  );

  reg.register({ name:"clean_unused", description:"Remove unused files from project folder", category:"file-manager", parameters:{ dry_run:{type:"boolean",description:"Preview without deleting",required:false}, move_to_trash:{type:"boolean",description:"Move to trash instead of delete",required:false} } },
    async (args: any) => {
      const unused = ["Old_sample.wav","Unused_loop.wav"];
      return { success:true, data:{ cleaned:true, dryRun:!!args?.dry_run, filesRemoved:unused.length, spaceFreed:"11.9 MB", files:unused } };
    }
  );

  reg.register({ name:"find_missing", description:"Scan for missing files (broken paths)", category:"file-manager", parameters:{} },
    async () => {
      const missing = [
        { name:"Missing_Kick.wav", expectedPath:"/Samples/Kicks/", lastKnown:"/OldProject/" },
        { name:"Reverb_Impulse.wav", expectedPath:"/IRs/", lastKnown:"/Library/IRs/" }
      ];
      return { success:true, data:{ scanned:true, missingCount:missing.length, missing, totalFilesScanned:156 } };
    }
  );

  reg.register({ name:"project_stats", description:"Get project file statistics", category:"file-manager", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      return { success:true, data:{ projectSize:"245 MB", trackCount:tracks.length, sampleCount:48, pluginCount:12, maxDeviceDepth:4, estimatedLoadTime:"8.5s" } };
    }
  );

  return reg;
}
