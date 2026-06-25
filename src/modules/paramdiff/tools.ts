// Módulo: Device Parameter Diff & Outlier — compares the same device across N tracks and
// flags parameters whose value is an outlier (sonic QA, the counterpart to structural Health).
// "Normalize" writes outliers to the group mean via DeviceParameter.setValue.
import { recordParamAt, keyDevice } from "../../core/history.js";
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

function parseIdx(s: any, song: any): number[] {
  if (s == null || s === "" || s === "all") return (song?.tracks || []).map((_: any, i: number) => i);
  return String(s).split(",").map((x: string) => parseInt(x.trim())).filter((n: number) => !isNaN(n));
}
async function readParams(d: any): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const p of d.parameters || []) out[p.name] = await p.getValue();
  return out;
}
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const stddev = (a: number[], m: number) => Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length);
const median = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"diff_devices", description:"Compare the same device across several tracks and flag outlier parameter values", category:"analysis", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices, or 'all'",required:false}, device_name:{type:"string",description:"Limit to one device type (e.g. 'EQ Eight')",required:false} } },
    async (args: any, song: any) => {
      const idxs = parseIdx(args.track_indices, song);
      // group {deviceName -> [{trackIndex, device}]}
      const groups: Record<string, { trackIndex: number; device: any }[]> = {};
      for (const ti of idxs) { const t = song?.tracks?.[ti]; if (!t) continue; for (const d of t.devices || []) { if (args.device_name && d.name !== args.device_name) continue; (groups[d.name] ||= []).push({ trackIndex: ti, device: d }); } }
      const result: any[] = [];
      for (const [name, list] of Object.entries(groups)) {
        if (list.length < 2) continue;
        const reads = await Promise.all(list.map(async (e) => ({ trackIndex: e.trackIndex, vals: await readParams(e.device), ranges: Object.fromEntries((e.device.parameters || []).map((p: any) => [p.name, [p.min, p.max]])) })));
        const paramNames = Object.keys(reads[0].vals).filter((pn) => reads.every((r) => pn in r.vals));
        const params = paramNames.map((pn) => {
          const values = reads.map((r) => ({ trackIndex: r.trackIndex, value: r.vals[pn] }));
          const nums = values.map((v) => v.value), m = mean(nums), sd = stddev(nums, m);
          const range = (reads[0].ranges[pn]?.[1] ?? 1) - (reads[0].ranges[pn]?.[0] ?? 0) || 1;
          // robust outlier test: a single bad value inflates stddev, so compare to the median.
          const med = median(nums), mad = median(nums.map((v) => Math.abs(v - med)));
          const tol = Math.max(range * 0.08, 1.5 * mad);
          const outliers = values.filter((v) => Math.abs(v.value - med) > tol).map((v) => v.trackIndex);
          return { name: pn, mean: Number(m.toFixed(3)), stddev: Number(sd.toFixed(3)), values: values.map((v) => ({ ...v, value: Number(v.value.toFixed(3)) })), outliers };
        }).filter((p) => p.outliers.length > 0);
        result.push({ deviceName: name, trackCount: list.length, outlierParams: params.length, params });
      }
      return { success:true, data:{ groups: result, scannedTracks: idxs.length } };
    }
  );

  reg.register({ name:"normalize_param", description:"Set a parameter to the group mean across the given tracks (fix an outlier)", category:"analysis", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, device_name:{type:"string",description:"Device name (e.g. 'EQ Eight')",required:true}, param_name:{type:"string",description:"Parameter name",required:true} } },
    async (args: any, song: any) => {
      const idxs = parseIdx(args.track_indices, song);
      const params: any[] = [];
      for (const ti of idxs) { const devs = song?.tracks?.[ti]?.devices || []; const d = devs.find((x: any) => x.name === args.device_name); if (!d) continue; const p = (d.parameters || []).find((x: any) => x.name === args.param_name); if (p) params.push({ p, ti, di: devs.indexOf(d) }); }
      if (params.length < 2) return { success:false, error:"Need the same device on at least 2 tracks." };
      const vals = await Promise.all(params.map((e) => e.p.getValue()));
      const m = mean(vals);
      for (const e of params) await recordParamAt(e.p, keyDevice(e.ti, e.di), "paramdiff.normalize_param");
      for (const e of params) await e.p.setValue(m);
      return { success:true, data:{ normalized:true, param:args.param_name, mean:Number(m.toFixed(3)), tracksSet:params.length } };
    }
  );

  return reg;
}
