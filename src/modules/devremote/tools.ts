// Módulo: Device Remote — a generic remote control for ANY device's parameters, including
// Max for Live devices. The SDK can't insert/install a third-party or M4L device
// (Track.insertDevice is native-Live-only), but once a device is already on a track —
// dropped there manually — Device/DeviceParameter are fully generic: we can list every
// parameter, read/set it directly, reset to default, and save/load full snapshots. This is
// the practical bridge for controlling a Max for Live instrument's macros from Live Studio.
import { recordParamAt, keyDevice } from "../../core/history.js";
import { saveJson, loadJson, listJson, deleteJson } from "../../core/storage.js";

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

const SUB = "devremote_snapshots";
function findParam(device: any, args: any): any {
  const params = device.parameters || [];
  if (args.param_index != null) return params[args.param_index];
  if (args.param_name) return params.find((p: any) => p.name === args.param_name);
  return null;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"list_devices", description:"List every device on a track (name, index, parameter count) — includes Max for Live and third-party devices already on the track", category:"devices", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const devices = (t.devices || []).map((d: any, i: number) => ({ index:i, name:d.name, paramCount:(d.parameters || []).length }));
      return { success:true, data:{ trackName:t.name, deviceCount:devices.length, devices } };
    }
  );

  reg.register({ name:"get_params", description:"List every parameter of a device with its current value, range and options — works on any device, native or Max for Live", category:"devices", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const d = t.devices?.[args.device_index]; if (!d) return { success:false, error:"Device not found" };
      const params = await Promise.all((d.parameters || []).map(async (p: any, i: number) => ({ index:i, name:p.name, value: Number((await p.getValue()).toFixed(4)), min:p.min, max:p.max, default:p.defaultValue, quantized:p.isQuantized, options: p.valueItems?.length ? p.valueItems.map((v: any) => v.label ?? v) : null })));
      return { success:true, data:{ trackName:t.name, deviceName:d.name, deviceIndex:args.device_index, paramCount:params.length, params } };
    }
  );

  reg.register({ name:"set_param", description:"Set a device parameter directly by index or name (undoable via Edit History)", category:"devices", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, param_index:{type:"number",description:"Parameter index (or use param_name)",required:false}, param_name:{type:"string",description:"Parameter name (or use param_index)",required:false}, value:{type:"number",description:"New value (clamped to the param's min/max)",required:true} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const d = t.devices?.[args.device_index]; if (!d) return { success:false, error:"Device not found" };
      const p = findParam(d, args); if (!p) return { success:false, error:"Parameter not found" };
      await recordParamAt(p, keyDevice(args.track_index, args.device_index), "devremote.set_param");
      const v = Math.max(p.min, Math.min(p.max, args.value));
      await p.setValue(p.isQuantized ? Math.round(v) : v);
      return { success:true, data:{ deviceName:d.name, param:p.name, value: Number((await p.getValue()).toFixed(4)) } };
    }
  );

  reg.register({ name:"reset_param", description:"Reset one parameter to its default value (undoable)", category:"devices", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, param_index:{type:"number",description:"Parameter index (or use param_name)",required:false}, param_name:{type:"string",description:"Parameter name (or use param_index)",required:false} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const d = t.devices?.[args.device_index]; if (!d) return { success:false, error:"Device not found" };
      const p = findParam(d, args); if (!p) return { success:false, error:"Parameter not found" };
      await recordParamAt(p, keyDevice(args.track_index, args.device_index), "devremote.reset_param");
      await p.setValue(p.defaultValue);
      return { success:true, data:{ deviceName:d.name, param:p.name, value: Number((await p.getValue()).toFixed(4)) } };
    }
  );

  reg.register({ name:"save_snapshot", description:"Save the full current parameter state of a device (e.g. a Max for Live instrument) to storage", category:"devices", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, name:{type:"string",description:"Snapshot name",required:true} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const d = t.devices?.[args.device_index]; if (!d) return { success:false, error:"Device not found" };
      const values = await Promise.all((d.parameters || []).map(async (p: any) => ({ name: p.name, value: await p.getValue() })));
      const id = `${args.track_index}_${args.device_index}_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
      saveJson(SUB, id, { id, name: args.name, deviceName: d.name, trackIndex: args.track_index, deviceIndex: args.device_index, values, ts: new Date().toISOString() });
      return { success:true, data:{ saved:true, id, name:args.name, deviceName:d.name, paramCount:values.length } };
    }
  );

  reg.register({ name:"list_snapshots", description:"List saved device snapshots", category:"devices", parameters:{ device_name:{type:"string",description:"Filter by device name",required:false} } },
    async (args: any) => {
      let snaps = listJson(SUB).map((s: any) => ({ id:s.id, name:s.name, deviceName:s.deviceName, trackIndex:s.trackIndex, deviceIndex:s.deviceIndex, paramCount:(s.values || []).length, ts:s.ts }));
      if (args.device_name) snaps = snaps.filter((s: any) => s.deviceName === args.device_name);
      return { success:true, data:{ snapshots: snaps } };
    }
  );

  reg.register({ name:"load_snapshot", description:"Restore a saved snapshot's parameter values onto the (still-present) device", category:"devices", parameters:{ id:{type:"string",description:"Snapshot id",required:true} } },
    async (args: any, song: any) => {
      const snap = loadJson(SUB, args.id); if (!snap) return { success:false, error:"Snapshot not found" };
      const t = song?.tracks?.[snap.trackIndex]; const d = t?.devices?.[snap.deviceIndex];
      if (!d) return { success:false, error:"Device is no longer on that track/index." };
      let restored = 0;
      for (const v of snap.values) {
        const p = (d.parameters || []).find((pp: any) => pp.name === v.name);
        if (!p) continue;
        try { await recordParamAt(p, keyDevice(snap.trackIndex, snap.deviceIndex), "devremote.load_snapshot"); await p.setValue(v.value); restored++; } catch {}
      }
      return { success:true, data:{ restored, total: snap.values.length, deviceName:d.name } };
    }
  );

  reg.register({ name:"delete_snapshot", description:"Delete a saved snapshot", category:"devices", parameters:{ id:{type:"string",description:"Snapshot id",required:true} } },
    async (args: any) => { const ok = deleteJson(SUB, args.id); return { success: ok, data:{ deleted: ok, id:args.id }, error: ok ? undefined : "Snapshot not found" }; }
  );

  reg.register({ name:"compare_snapshots", description:"Diff two saved device snapshots parameter-by-parameter", category:"devices", parameters:{ id_a:{type:"string",description:"First snapshot id",required:true}, id_b:{type:"string",description:"Second snapshot id",required:true} } },
    async (args: any) => {
      const a = loadJson(SUB, args.id_a), b = loadJson(SUB, args.id_b);
      if (!a || !b) return { success:false, error:"One or both snapshots not found." };
      const byName = (s: any) => new Map(s.values.map((v: any) => [v.name, v.value]));
      const va = byName(a), vb = byName(b);
      const names = new Set([...va.keys(), ...vb.keys()]);
      const diffs: any[] = [];
      for (const name of names) {
        const x = va.get(name), y = vb.get(name);
        if (x !== y) diffs.push({ param:name, a: x ?? null, b: y ?? null, delta: (typeof x === "number" && typeof y === "number") ? Number((y - x).toFixed(4)) : null });
      }
      return { success:true, data:{ nameA:a.name, nameB:b.name, deviceName:a.deviceName, paramsCompared:names.size, paramsDifferent:diffs.length, diffs } };
    }
  );

  reg.register({ name:"sweep_param", description:"Sweep a device parameter from one value to another over real wall-clock time (undoable — restores the pre-sweep value). Useful for filter sweeps/risers/builds without Live's automation UI.", category:"devices", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, param_index:{type:"number",description:"Parameter index (or use param_name)",required:false}, param_name:{type:"string",description:"Parameter name (or use param_index)",required:false}, from:{type:"number",description:"Start value",required:true}, to:{type:"number",description:"End value",required:true}, duration_ms:{type:"number",description:"Total sweep duration in ms (max 10000, default 2000)",required:false}, steps:{type:"number",description:"Number of steps (default 20, max 100)",required:false}, curve:{type:"string",description:"Interpolation curve",required:false,enum:["linear","exponential","logarithmic"]} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const d = t.devices?.[args.device_index]; if (!d) return { success:false, error:"Device not found" };
      const p = findParam(d, args); if (!p) return { success:false, error:"Parameter not found" };
      const duration = Math.max(50, Math.min(10000, args.duration_ms ?? 2000));
      const steps = Math.max(2, Math.min(100, Math.round(args.steps ?? 20)));
      const from = Math.max(p.min, Math.min(p.max, args.from));
      const to = Math.max(p.min, Math.min(p.max, args.to));
      const curve = args.curve || "linear";
      const shape = (f: number) => curve === "exponential" ? f * f : curve === "logarithmic" ? Math.sqrt(f) : f;
      await recordParamAt(p, keyDevice(args.track_index, args.device_index), "devremote.sweep_param");
      const stepMs = duration / steps;
      for (let i = 0; i <= steps; i++) {
        const v = from + (to - from) * shape(i / steps);
        try { await p.setValue(p.isQuantized ? Math.round(v) : v); } catch { break; }
        if (i < steps) await sleep(stepMs);
      }
      return { success:true, data:{ swept:true, deviceName:d.name, param:p.name, from, to, steps, durationMs:duration, curve, finalValue: Number((await p.getValue()).toFixed(4)) } };
    }
  );

  return reg;
}
