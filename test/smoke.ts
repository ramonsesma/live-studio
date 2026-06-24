// Smoke test: levanta el servidor con un `song` simulado y verifica endpoints + tools.
import { createMasterRegistry } from "../src/registry/index.js";
import { Bridge } from "../src/bridge.js";
import { startServer } from "../src/server.js";

// ---- Mock del Song SDK ----
// Refleja la forma REAL del SDK (clip.notes: NoteDescription[], mixer.volume.getValue/
// setValue, clipSlots[].clip, cuePoints…) y además mantiene la API histórica
// (addNote/noteCount) para los tools que aún no se han migrado, de modo que ambos pasan.
function makeParam(name: string, value: number) {
  let v = value;
  return { name, min: 0, max: 1, defaultValue: value, async getValue() { return v; }, async setValue(x: number) { v = x; } };
}
function makeClip(name: string, seed: any[] = []) {
  let _notes: any[] = seed.slice();
  return {
    name, color: 0, looping: false, loopStart: 0, loopEnd: 4, muted: false, startTime: 0, duration: 4,
    get notes() { return _notes; }, set notes(n: any[]) { _notes = n; },
    async addNote(p: number, s: number, d: number, v: number) { _notes.push({ pitch: p, startTime: s, duration: d, velocity: v }); },
    get noteCount() { return _notes.length; },
  };
}
function makeTrack(name: string, kind = "MidiTrack") {
  const clip = makeClip(name + " clip", [0, 1, 2, 3].map((i) => ({ pitch: 60 + i, startTime: i, duration: 1, velocity: 100 })));
  return {
    name, solo: false, mute: false, arm: false, mutedViaSolo: false,
    devices: [] as any[], arrangementClips: [] as any[], takeLanes: [] as any[], groupTrack: null,
    clipSlots: [{ clip, async createMidiClip() { return clip; }, async deleteClip() {} }],
    mixer: { volume: makeParam("Volume", 0.85), panning: makeParam("Pan", 0.5), sends: [makeParam("Send A", 0)] },
    constructor: { name: kind },
    async createMidiClip(_s: number, _d: number) { return clip; },
    async insertDevice(dn: string) { const d = { name: dn, parameters: [] as any[] }; this.devices.push(d); return d; },
  };
}
const song: any = {
  tempo: 120, gridQuantization: "1/16", gridIsTriplet: false, rootNote: 0, scaleName: "Major", scaleMode: true,
  isPlaying: false, metronome: false, timeSignature: [4, 4], name: "Demo Set",
  tracks: [makeTrack("Drum Bus"), makeTrack("Bass")],
  scenes: [{ name: "Intro", tempo: 120, signatureNumerator: 4, signatureDenominator: 4 }, { name: "Chorus", tempo: 120, signatureNumerator: 4, signatureDenominator: 4 }],
  returnTracks: [{ name: "A-Reverb" }],
  cuePoints: [{ time: 0, name: "Intro" }, { time: 16, name: "Drop" }],
  async createMidiTrack() { const t = makeTrack("New MIDI"); this.tracks.push(t); return t; },
  async createAudioTrack() { const t = makeTrack("New Audio", "AudioTrack"); this.tracks.push(t); return t; },
  async createScene(_i: number) { const s = { name: "New Scene", tempo: 120, signatureNumerator: 4, signatureDenominator: 4 }; this.scenes.push(s); return s; },
  async createCuePoint(time: number) { const c = { time, name: "Cue" }; this.cuePoints.push(c); return c; },
};

const reg = createMasterRegistry();
const bridge = new Bridge(reg, song);
const server = await startServer(bridge);
const base = server.url;
let pass = 0, fail = 0;
function check(label: string, cond: boolean, extra = "") { if (cond) { pass++; console.log("  ✓ " + label); } else { fail++; console.log("  ✗ " + label + "  " + extra); } }
const get = async (p: string) => (await fetch(base + p)).json();
const post = async (p: string, b: any) => (await fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) })).json();

console.log("\n=== Live Studio smoke test @ " + base + " ===");

// 1. modules
const mods = await get("/api/modules");
check("GET /api/modules devuelve 57 módulos", (mods.modules || []).length === 57, JSON.stringify(mods.modules?.map((m: any) => m.id)));
check("quickactions marcado como hidden", mods.modules.find((m: any) => m.id === "quickactions")?.hidden === true);
check("56 módulos visibles (sin hidden)", mods.modules.filter((m: any) => !m.hidden).length === 56);

// 2. tools list + namespacing
const allTools = (await get("/api/tools")).tools;
check("GET /api/tools agrega todos los tools", allTools.length >= 240, "n=" + allTools.length);
const drumTools = (await get("/api/tools?module=drums")).tools;
check("filtro por módulo (drums)", drumTools.length === 3 && drumTools.every((t: any) => t.module === "drums"));

// 3. execute: tool sin song
const genres = await post("/api/execute", { name: "drums__get_genres", args: {} });
check("execute drums__get_genres", genres.success && genres.data.genres.length === 8);

// 4. execute: tool con song (crea pista + clip)
const chords = await post("/api/execute", { name: "chords__generate_chords", args: { key: "C", scale: "minor", genre: "pop" } });
check("execute chords__generate_chords crea progresión", chords.success && chords.data.progression.length === 4, JSON.stringify(chords));

const drumGen = await post("/api/execute", { name: "drums__generate_pattern", args: { genre: "techno" } });
check("execute drums__generate_pattern", drumGen.success && drumGen.data.clipName.includes("Techno"));

// 5. control de sesión real (mock)
const before = song.tracks.length;
const mk = await post("/api/execute", { name: "session__create_midi_track", args: { name: "Bajo" } });
check("session__create_midi_track añade pista", mk.success && song.tracks.length === before + 1);
const info = await post("/api/execute", { name: "session__get_session_info", args: {} });
check("session__get_session_info", info.success && info.data.tempo === 120);

// 5b. lote 2: módulos nuevos
const vx = await post("/api/execute", { name: "vocal__setup_chain", args: { track_index: 0, chain_type: "lead" } });
check("vocal__setup_chain crea cadena", vx.success && vx.data.deviceCount > 0);
const sfx = await post("/api/execute", { name: "sfx__generate_sfx", args: { category: "cinematic", sound: "whoosh" } });
check("sfx__generate_sfx crea clip", sfx.success && sfx.data.clipName.includes("whoosh"));
const arr = await post("/api/execute", { name: "arrangement__get_markers", args: {} });
check("arrangement__get_markers", arr.success && arr.data.markers.length >= 1);

// 5c. lote 3: performance / composición / organización
const mel = await post("/api/execute", { name: "melody__generate_melody", args: { key: "A", scale: "minor", bars: 2 } });
check("melody__generate_melody crea clip", mel.success && mel.data.clipName.includes("Melody"));
const perf = await post("/api/execute", { name: "performance__create_performance_scene", args: { name: "Drop" } });
check("performance__create_performance_scene usa createScene", perf.success && perf.data.name === "Drop");
const take = await post("/api/execute", { name: "takes__comp_from_takes", args: { track_index: 0 } });
check("takes__comp_from_takes crea pista comp", take.success && take.data.compiled);
const col = await post("/api/execute", { name: "colorizer__color_by_velocity", args: { track_index: 0, scheme: "heatmap" } });
check("colorizer__color_by_velocity", col.success && col.data.clipsColored === 5);
const clp = await post("/api/execute", { name: "clips__launch_scene", args: { scene_index: 0 } });
check("clips__launch_scene", clp.success && clp.data.launched);

// 5d. lote 4: mezcla / síntesis / organización avanzada
const gain = await post("/api/execute", { name: "mastering__analyze_gain_structure", args: {} });
check("mastering__analyze_gain_structure", gain.success && Array.isArray(gain.data.stages));
const syn = await post("/api/execute", { name: "synth__add_module", args: { type: "oscillator" } });
check("synth__add_module mantiene estado", syn.success && syn.data.totalModules === 1);
const tpl = await post("/api/execute", { name: "templates__extract_template", args: { name: "Mi Plantilla" } });
check("templates__extract_template", tpl.success && tpl.data.name === "Mi Plantilla");
const nadd = await post("/api/execute", { name: "notes__add_note", args: { text: "Revisar el bajo", category: "mix" } });
check("notes__add_note + get_notes (estado)", nadd.success && nadd.data.totalNotes === 1);
const nget = await post("/api/execute", { name: "notes__get_notes", args: { category: "mix" } });
check("notes__get_notes filtra por categoría", nget.success && nget.data.count === 1);
const grv = await post("/api/execute", { name: "groove__apply_groove", args: { track_index: 0, clip_index: 0, amount: 80 } });
check("groove__apply_groove", grv.success && grv.data.amount === 80);

// 5e. módulo estrella: organizer (panel rico)
const sumr = await post("/api/execute", { name: "organizer__get_session_summary", args: {} });
check("organizer__get_session_summary (score + grupos)", sumr.success && typeof sumr.data.organizationScore === "number" && sumr.data.sceneGroups);
const ana2 = await post("/api/execute", { name: "organizer__analyze_session_structure", args: {} });
check("organizer__analyze_session_structure (efficiency)", ana2.success && typeof ana2.data.efficiencyScore === "number");
const tplg = await post("/api/execute", { name: "organizer__create_session_template", args: { genre: "electronic" } });
check("organizer__create_session_template", tplg.success && tplg.data.tracks.length > 0);
const exp = await post("/api/execute", { name: "organizer__export_session_info", args: { format: "json" } });
check("organizer__export_session_info json", exp.success && exp.data.content.includes("metadata"));
const panelJs = await fetch(base + "/panels/organizer.js");
check("sirve panel rico /panels/organizer.js", panelJs.ok && (panelJs.headers.get("content-type") || "").includes("javascript"));

// 5n. módulo estrella fxchain + paneles ricos servidos
const fxc = await post("/api/execute", { name: "fxchain__get_effects_chains", args: {} });
check("fxchain__get_effects_chains (5 géneros)", fxc.success && fxc.data.chains.length === 5);
const fxAudio = await post("/api/execute", { name: "session__create_audio_track", args: { name: "FX Audio" } });
let panelsOk = true;
const allPanels = ["organizer", "fxchain", "mixconsole", "stepseq", "chordpads", "drums", "drummap", "clipgraph", "notation", "takes"];
for (const p of allPanels) {
  const res = await fetch(base + "/panels/" + p + ".js");
  if (!res.ok || !(res.headers.get("content-type") || "").includes("javascript")) panelsOk = false;
}
check("sirve los 10 paneles ricos", panelsOk);

// 5g. lote 6: mezcla / análisis / MIDI / arreglo
const cmp = await post("/api/execute", { name: "compressor__apply_compression_preset", args: { track_index: 0, preset: "drum_bus" } });
check("compressor__apply_compression_preset", cmp.success && cmp.data.params.ratio === 4);
const hrm = await post("/api/execute", { name: "harmonizer__generate_chord_clip", args: { key: "C", scale: "major", degrees: "I,IV,V" } });
check("harmonizer__generate_chord_clip crea clip", hrm.success && hrm.data.chordCount === 3);
const qnt = await post("/api/execute", { name: "quantizer__apply_swing", args: { track_index: 0, clip_index: 0, preset: "hip-hop" } });
check("quantizer__apply_swing (preset)", qnt.success && qnt.data.feel === "laid-back");
const dly = await post("/api/execute", { name: "delaycalc__calculate", args: { bpm: 120, note_value: "1/8" } });
check("delaycalc__calculate (1/8 @120 = 250ms)", dly.success && dly.data.delayMs === 250);
const rnd = await post("/api/execute", { name: "randomizer__randomize_velocity", args: { track_index: 0, clip_index: 0 } });
check("randomizer__randomize_velocity", rnd.success && rnd.data.mode === "velocity");
const sec = await post("/api/execute", { name: "sections__get_sections", args: {} });
check("sections__get_sections", sec.success && Array.isArray(sec.data.sections) && sec.data.sections.length >= 1);

// 5h. lote 7: composición / FX / gestión / tuning
const lyr = await post("/api/execute", { name: "lyricmelody__generate_melody_from_lyrics", args: { text: "hello world this is a test" } });
check("lyricmelody__generate_melody_from_lyrics crea clip", lyr.success && lyr.data.clipName.includes("LyricMelody"));
const tsg = await post("/api/execute", { name: "timesig__apply_polyrhythm", args: { sigs: "3/4,4/4,5/8" } });
check("timesig__apply_polyrhythm crea pistas", tsg.success && tsg.data.tracks.length === 3);
const cpd = await post("/api/execute", { name: "chordpads__set_pad", args: { pad_index: 0, root: "C", chord_type: "maj7" } });
check("chordpads__set_pad computes real chord notes", cpd.success && cpd.data.chord === "C Major 7" && cpd.data.notes.length === 4);
const cptr = await post("/api/execute", { name: "chordpads__trigger_pad", args: { pad_index: 0 } });
check("chordpads__trigger_pad drops the assigned chord as a clip", cptr.success && cptr.data.notesPlayed === 4);
const snp = await post("/api/execute", { name: "snapshots__save_snapshot", args: { name: "Mix v1" } });
check("snapshots__save_snapshot", snp.success && snp.data.total === 1);
const hlt = await post("/api/execute", { name: "health__run_checks", args: {} });
check("health__run_checks (score)", hlt.success && hlt.data.score === 92);

// 5i. lote 8: hardware / conversión / live / routing
const nta = await post("/api/execute", { name: "notation__get_clip_notes", args: { track_index: 0, clip_index: 0 } });
check("notation__get_clip_notes", nta.success && Array.isArray(nta.data.notes) && nta.data.notes.length > 0);
const drp = await post("/api/execute", { name: "drumreplace__replace_drum", args: { track_index: 0, clip_index: 0, drum_type: "kick" } });
check("drumreplace__replace_drum crea pista MIDI", drp.success && drp.data.replaced);
const gar = await post("/api/execute", { name: "genarranger__generate_arrangement", args: { style: "techno" } });
check("genarranger__generate_arrangement", gar.success && gar.data.totalBars === 96);
const stl = await post("/api/execute", { name: "setlist__create_setlist", args: { name: "Live Set" } });
check("setlist__create_setlist", stl.success && stl.data.setlistId.startsWith("set_"));
const grp = await post("/api/execute", { name: "grouprouting__create_group", args: { name: "Drum Bus", track_indices: "0,1" } });
check("grouprouting__create_group usa createGroupTrack", grp.success && grp.data.groupCreated);
const btm = await post("/api/execute", { name: "trackmanager__bulk_action", args: { track_indices: "0,1,2", action: "mute" } });
check("trackmanager__bulk_action", btm.success && btm.data.trackCount === 3);
const tsy = await post("/api/execute", { name: "temposync__set_tempo", args: { bpm: 140 } });
check("temposync__set_tempo (namespaced, no colisión con session)", tsy.success && tsy.data.tempo === 140);

// 5j. lote 9: mezcla / utilidades / secuenciación / restauración
const mxs = await post("/api/execute", { name: "mixscene__save_scene", args: { name: "Verse Mix" } });
check("mixscene__save_scene", mxs.success && mxs.data.sceneSaved);
const cns = await post("/api/execute", { name: "console__execute_command", args: { command: "get tempo" } });
check("console__execute_command (tempo)", cns.success && typeof cns.data.result.tempo === "number");
const cvh = await post("/api/execute", { name: "clipversions__save_version", args: { track_index: 0, clip_index: 0, label: "v1" } });
check("clipversions__save_version", cvh.success && cvh.data.totalVersions === 1);
const dmp = await post("/api/execute", { name: "drummap__set_drum_mapping", args: { track_index: 0, pad_index: 0, note: 36 } });
check("drummap__set_drum_mapping (GM 36=Kick)", dmp.success && dmp.data.name === "Kick");
const mgt = await post("/api/execute", { name: "midigate__set_gate_pattern", args: { pattern: "1010100010101000" } });
check("midigate__set_gate_pattern", mgt.success && mgt.data.resolvedSteps === 6);
const stp = await post("/api/execute", { name: "stepseq__set_pattern", args: { track_index: 0, steps: 16 } });
check("stepseq__set_pattern (16 pasos)", stp.success && stp.data.totalSteps === 16);

// 5k. lote 10: mezcla avanzada / synth / live / análisis
const dbs = await post("/api/execute", { name: "drumbus__add_drum_group", args: { tracks: "0,1" } });
check("drumbus__add_drum_group", dbs.success && dbs.data.groupCreated);

// 5l. lote 11: mezcla / MIDI / FX / export
const mcv = await post("/api/execute", { name: "mixconsole__get_mixer_state", args: {} });
check("mixconsole__get_mixer_state", mcv.success && Array.isArray(mcv.data.channels));
const tcc = await post("/api/execute", { name: "trackcolor__apply_color_scheme", args: { scheme: "rainbow" } });
check("trackcolor__apply_color_scheme", tcc.success && tcc.data.scheme === "rainbow");
const rkb = await post("/api/execute", { name: "rackbuilder__create_rack", args: { track_index: 0, rack_type: "instrument", name: "Lead Rack" } });
check("rackbuilder__create_rack (8 macros)", rkb.success && rkb.data.macroCount === 8);
const mtf = await post("/api/execute", { name: "miditransform__apply_arpeggio", args: { track_index: 0, clip_index: 0, pattern: "updown" } });
check("miditransform__apply_arpeggio", mtf.success && mtf.data.pattern === "updown");
const mlf = await post("/api/execute", { name: "midilfo__set_lfo_multi_target", args: { track_index: 0, targets: "cutoff,res,vol" } });
check("midilfo__set_lfo_multi_target (3 targets)", mlf.success && mlf.data.targetCount === 3);

// 5m. lote 12: live / utilidades / análisis / MIDI
const lqz = await post("/api/execute", { name: "launchquant__set_global_quant", args: { value: "1/8" } });
check("launchquant__set_global_quant", lqz.success && lqz.data.globalQuant === "1/8");
const sbx = await post("/api/execute", { name: "sandbox__eval_typescript", args: { code: "return song.tempo + 1;", return_value: true } });
check("sandbox__eval_typescript (eval real)", sbx.success && typeof sbx.data.result === "number");
const cgr = await post("/api/execute", { name: "clipgraph__build_graph", args: {} });
check("clipgraph__build_graph", cgr.success && cgr.data.nodeCount > 0);
const ttp = await post("/api/execute", { name: "tempotap__tap", args: {} });
check("tempotap__tap", ttp.success && ttp.data.tapRecorded);

// 5f. paleta de comandos rápidos (micro-acciones)
const qa = await post("/api/execute", { name: "quickactions__list_quick_actions", args: {} });
check("quickactions__list_quick_actions (1293 acciones)", qa.success && qa.data.total === 1293 && qa.data.groups === 215);
const qaf = await post("/api/execute", { name: "quickactions__list_quick_actions", args: { query: "octave" } });
check("quickactions filtra por query", qaf.success && qaf.data.count > 0 && qaf.data.count < qa.data.total);
const qrun = await post("/api/execute", { name: "quickactions__run_quick_action", args: { group: "Transpose", action: "Octave Up" } });
check("quickactions__run_quick_action ejecuta", qrun.success && qrun.data.ran && qrun.data.group === "Transpose");
const qbad = await post("/api/execute", { name: "quickactions__run_quick_action", args: { group: "Nope", action: "Nope" } });
check("quickactions acción inexistente → error", qbad.success === false);

// 6. errores controlados
const bad = await post("/api/execute", { name: "does__not_exist", args: {} });
check("tool inexistente → error controlado", bad.success === false && /Unknown tool/.test(bad.error));

// 7. chat sin key → 400 controlado
const chat = await post("/api/chat", { messages: [{ role: "user", content: "hola" }] });
check("chat sin API key → error claro", chat.success === false && /API key/i.test(chat.error));

// 8. estáticos
const html = await (await fetch(base + "/")).text();
check("sirve index.html (shell)", html.includes("Live Studio") && html.includes("shell.js"));
const js = await fetch(base + "/shell.js");
check("sirve shell.js con mime correcto", (js.headers.get("content-type") || "").includes("javascript"));

console.log(`\n=== Resultado: ${pass} OK, ${fail} fallos ===`);
await server.close();
process.exit(fail ? 1 : 0);
