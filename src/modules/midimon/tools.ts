// Módulo: MIDI Monitor — reutilizado de examples/midi-monitor
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

  reg.register({ name:"start_monitor", description:"Start monitoring incoming MIDI messages", category:"midi-mon", parameters:{ port:{type:"string",description:"MIDI input port name (optional)",required:false}, filter_notes:{type:"boolean",description:"Show note on/off",required:false}, filter_cc:{type:"boolean",description:"Show CC messages",required:false} } },
    async () => ({ success:true, data:{ monitoring:true, status:"Listening on all MIDI inputs", filter:{ notes:true, cc:true, pitchbend:true, aftertouch:true, programChange:true } } })
  );

  reg.register({ name:"get_midi_log", description:"Get recent MIDI messages log", category:"midi-mon", parameters:{ count:{type:"number",description:"Number of messages to return",required:false} } },
    async (args: any) => {
      const msgs = Array.from({length:args.count||20}, (_, i) => ({
        time:`${(Date.now()-i*200)%60000}ms ago`, port:"Launchpad MIDI",
        type:["Note On","Note Off","CC","Pitch Bend"][i%4],
        data:["C3 v=100","C3 v=0","CC 7: 64","PB: +200"][i%4], channel:i%16+1
      }));
      return { success:true, data:{ messageCount:msgs.length, messages:msgs, totalCaptured:2456 } };
    }
  );

  reg.register({ name:"clear_log", description:"Clear MIDI message log", category:"midi-mon", parameters:{} },
    async () => ({ success:true, data:{ cleared:true, messagesRemoved:2456 } })
  );

  reg.register({ name:"set_filter", description:"Set MIDI message type filter", category:"midi-mon", parameters:{ note:{type:"boolean",description:"Filter notes",required:false}, cc:{type:"boolean",description:"Filter CC",required:false}, pitchbend:{type:"boolean",description:"Filter pitch bend",required:false}, aftertouch:{type:"boolean",description:"Filter aftertouch",required:false}, program_change:{type:"boolean",description:"Filter program change",required:false} } },
    async (args: any) => ({ success:true, data:{ filterSet:true, filters:args } })
  );

  reg.register({ name:"get_stats", description:"Get MIDI traffic statistics", category:"midi-mon", parameters:{} },
    async () => ({ success:true, data:{ messagesPerMinute:1240, peakRate:3200, totalNotes:8452, totalCC:12304, busiestPort:"Launchpad MIDI", busiestChannel:1 } })
  );

  return reg;
}
