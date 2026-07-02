// Smoke test: levanta el servidor con un `song` simulado y verifica endpoints + tools.
import { createMasterRegistry } from "../src/registry/index.js";
import { Bridge } from "../src/bridge.js";
import { startServer } from "../src/server.js";
import { toMusicXML, fromMusicXML } from "../src/core/musicxml.js";
import { existsSync } from "node:fs";

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
check("GET /api/modules devuelve 132 módulos", (mods.modules || []).length === 132, JSON.stringify(mods.modules?.map((m: any) => m.id)));
check("quickactions visible con su propio panel (launcher)", mods.modules.find((m: any) => m.id === "quickactions") && !mods.modules.find((m: any) => m.id === "quickactions")?.hidden);
check("132 módulos visibles (sin hidden)", mods.modules.filter((m: any) => !m.hidden).length === 132);

// 2. tools list + namespacing
const allTools = (await get("/api/tools")).tools;
check("GET /api/tools agrega todos los tools", allTools.length >= 240, "n=" + allTools.length);
const drumTools = (await get("/api/tools?module=drums")).tools;
check("filtro por módulo (drums)", drumTools.length === 3 && drumTools.every((t: any) => t.module === "drums"));
// Regression check: MasterRegistry.addTool (used to wire Bridge-backed tools like resonance's
// masking matrix into the copilot) must expose the fully-qualified name in its definition, not
// just key the handler correctly — otherwise find_tools/run_tool can't discover it at all even
// though direct /api/execute calls with the right name still work (which is how this slipped by).
check("addTool expone el nombre calificado (module__name), no solo el handler", allTools.some((t: any) => t.name === "resonance__mask_matrix") && allTools.some((t: any) => t.name === "stemexport__export") && allTools.some((t: any) => t.name === "mixcoach__analyze"));
const bridgeToolViaFind = bridge.findTools("masking matrix");
check("find_tools descubre los tools de addTool con su nombre real", bridgeToolViaFind.some((t: any) => t.name === "resonance__mask_matrix"));

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
check("takes__comp_from_takes crea pista real (advisory sobre el splicing)", take.success && take.data.advisory && typeof take.data.compTrackIndex === "number");
const colSong: any = { tracks: [{ name: "Keys", clipSlots: [{ clip: { name: "c", color: 0, notes: [{ pitch: 60, startTime: 0, duration: 1, velocity: 120 }, { pitch: 64, startTime: 1, duration: 1, velocity: 120 }] } }], arrangementClips: [] }] };
const col = await reg.execute("colorizer__color_by_velocity", { track_index: 0, scheme: "heatmap" }, colSong);
check("colorizer pinta clips por velocity (clip.color real)", col.success && col.data.clipsColored === 1 && colSong.tracks[0].clipSlots[0].clip.color > 0);
const roleSong: any = { tracks: [
  { name: "Kick", clipSlots: [{ clip: { name: "beat", color: 0, notes: Array.from({length:4},(_,i)=>({pitch:36,startTime:i,duration:0.5,velocity:100})) } }], arrangementClips: [] },
  { name: "Sub", clipSlots: [{ clip: { name: "low", color: 0, notes: [{ pitch: 33, startTime: 0, duration: 4, velocity: 100 }] } }], arrangementClips: [] },
  { name: "Strings", clipSlots: [{ clip: { name: "sustain", color: 0, notes: [{ pitch: 67, startTime: 0, duration: 4, velocity: 90 }] } }], arrangementClips: [] },
] };
const roleAll = await reg.execute("colorizer__color_by_role", {}, roleSong);
check("colorizer color_by_role clasifica por contenido real (drums/bass/pad) en todo el proyecto", roleAll.success && roleAll.data.clipsColored === 3 && roleAll.data.byRole.drums === 1 && roleAll.data.byRole.bass === 1 && roleAll.data.byRole.pad === 1);
const clp = await post("/api/execute", { name: "clips__launch_scene", args: { scene_index: 0 } });
check("clips__launch_scene (advisory — no transport API)", clp.success && clp.data.advisory && clp.data.sceneName === "Intro");

// 5d. lote 4: mezcla / síntesis / organización avanzada
const gain = await post("/api/execute", { name: "mastering__analyze_gain_structure", args: {} });
check("mastering__analyze_gain_structure", gain.success && Array.isArray(gain.data.stages));
const syn = await post("/api/execute", { name: "synth__add_module", args: { type: "oscillator" } });
check("synth__add_module persiste a disco", syn.success && syn.data.module.type === "oscillator" && syn.data.totalModules >= 1);
const tpl = await post("/api/execute", { name: "templates__extract_template", args: { name: "Mi Plantilla" } });
check("templates__extract_template", tpl.success && tpl.data.name === "Mi Plantilla");
const noteText = `Revisar el bajo ${Date.now()}`;
const nadd = await post("/api/execute", { name: "notes__add_note", args: { text: noteText, category: "mix" } });
check("notes__add_note persiste a disco", nadd.success && nadd.data.note.text === noteText);
const nget = await post("/api/execute", { name: "notes__get_notes", args: { category: "mix" } });
check("notes__get_notes filtra por categoría", nget.success && nget.data.notes.some((n: any) => n.id === nadd.data.noteId));
const ndel = await post("/api/execute", { name: "notes__delete_note", args: { note_id: nadd.data.noteId } });
check("notes__delete_note limpia el estado", ndel.success && ndel.data.deleted);
const grv = await post("/api/execute", { name: "groove__apply_groove", args: { track_index: 0, clip_index: 0, amount: 80 } });
check("groove__apply_groove", grv.success && grv.data.amount === 80);

// 5e. módulo estrella: organizer (panel rico)
const sumr = await post("/api/execute", { name: "organizer__get_session_summary", args: {} });
check("organizer__get_session_summary (score + grupos)", sumr.success && typeof sumr.data.organizationScore === "number" && sumr.data.sceneGroups);
const ana2 = await post("/api/execute", { name: "organizer__analyze_session_structure", args: {} });
check("organizer__analyze_session_structure (efficiency)", ana2.success && typeof ana2.data.efficiencyScore === "number");
const tplg = await post("/api/execute", { name: "organizer__create_session_template", args: { genre: "electronic" } });
check("organizer__create_session_template", tplg.success && tplg.data.tracks.length > 0);
check("organizer.create_session_template persiste un template real y appliable", tplg.success && !!tplg.data.templateId);
const orgApplySong: any = { tracks: [] as any[] };
const orgMakeTrack = () => { const t: any = { _n: "", get name() { return this._n; }, set name(v: any) { this._n = v; } }; orgApplySong.tracks.push(t); return t; };
orgApplySong.createMidiTrack = async () => orgMakeTrack();
orgApplySong.createAudioTrack = async () => orgMakeTrack();
const tplgApply = await reg.execute("templates__apply_template", { template_id: tplg.data.templateId }, orgApplySong);
check("el template de organizer se puede aplicar de verdad vía templates__apply_template", tplgApply.success && tplgApply.data.tracksCreated === tplg.data.tracks.length);
const exp = await post("/api/execute", { name: "organizer__export_session_info", args: { format: "json" } });
check("organizer__export_session_info json", exp.success && exp.data.content.includes("metadata"));
const panelJs = await fetch(base + "/panels/organizer.js");
check("sirve panel rico /panels/organizer.js", panelJs.ok && (panelJs.headers.get("content-type") || "").includes("javascript"));

// 5n. módulo estrella fxchain + paneles ricos servidos
const fxc = await post("/api/execute", { name: "fxchain__get_effects_chains", args: {} });
check("fxchain__get_effects_chains (5 géneros)", fxc.success && fxc.data.chains.length === 5);
const fxAudio = await post("/api/execute", { name: "session__create_audio_track", args: { name: "FX Audio" } });
let panelsOk = true;
const allPanels = ["organizer", "fxchain", "mixconsole", "stepseq", "chordpads", "drums", "drummap", "clipgraph", "notation", "takes", "eq", "midilfo", "midigate", "synth", "genarranger", "trackmanager", "health", "mastering", "rackbuilder", "performance", "clipversions", "resonance", "autogain", "keyscale", "genrhythm", "texturemap", "spectrumcompare", "projectsnapshot", "scoreeditor", "clipvariations", "stemalign", "samplebrain", "macromorph", "loopdetect", "warpcompare", "paramdiff", "phrasefinder", "saferandom", "groovetemplate", "probabilitylab", "velocompress", "transposer", "colortheory", "takeorganizer", "audio2midi", "history", "bassengine", "sessionbridge", "patternlang", "harmonizer", "quickactions", "miditransform", "quantizer", "randomizer", "arrangement", "timestretch", "drumsynth", "slicelab", "mosaic", "riser", "sub808", "padengine", "pluckengine", "acid303", "chordstab", "fmbell", "impact", "console", "subbass", "organ", "vocalchop", "instrumentrender", "brass", "wobble", "choir", "subdrop", "pluckbass", "sawlead", "reese", "marimba", "glitch", "tapehiss", "trumpet", "epiano", "musicbox", "harp", "whistle", "subwobble", "vocoder", "noisefx", "cymbal", "guitar", "sitar", "steeldrum", "accordion", "theremin", "hihat808", "stabhit", "glassbell", "subkick", "reversesweep", "devremote", "stemexport", "mixcoach", "templates", "mixscene", "tempotap", "notes", "sandbox", "delaycalc", "setlist", "fxpresets", "groove", "colorizer", "vocal"];
for (const p of allPanels) {
  const res = await fetch(base + "/panels/" + p + ".js");
  if (!res.ok || !(res.headers.get("content-type") || "").includes("javascript")) panelsOk = false;
}
check("sirve los 115 paneles ricos", panelsOk);

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
const hlt = await post("/api/execute", { name: "health__run_checks", args: {} });
check("health__run_checks (real scan)", hlt.success && typeof hlt.data.score === "number" && Array.isArray(hlt.data.issues));
// real health scan on a constructed broken project
const healthSong: any = {
  tracks: [
    { name: "Lead", clipSlots: [{ clip: { notes: [] } }], arrangementClips: [] },
    { name: "Lead", clipSlots: [], arrangementClips: [] },
    { name: "Audio", clipSlots: [{ clip: { filePath: "/no/such/file_xyz.wav", warping: false, duration: 16 } }], arrangementClips: [] },
  ],
  scenes: [{ name: "Intro" }, { name: "Empty" }],
  async deleteTrack() {}, async deleteScene() {},
};
const hc = await reg.execute("health__run_checks", {}, healthSong);
check("health detecta sample faltante", hc.success && hc.data.issues.some((i: any) => i.type === "missing_sample"));
check("health detecta duplicado + pista vacía + escena vacía", hc.data.issues.some((i: any) => i.type === "duplicate_name") && hc.data.issues.some((i: any) => i.type === "empty_track") && hc.data.issues.some((i: any) => i.type === "empty_scene"));
check("health score baja con issues", hc.data.score < 100 && hc.data.score >= 0);
const dup = hc.data.issues.find((i: any) => i.type === "duplicate_name");
const af = await reg.execute("health__apply_fix", { kind: "rename_track", track_index: dup.fix.trackIndex, new_name: dup.fix.newName }, healthSong);
check("health apply_fix renombra el duplicado real", af.success && healthSong.tracks[dup.fix.trackIndex].name === dup.fix.newName);
check("health detecta clip MIDI vacío", hc.data.issues.some((i: any) => i.type === "empty_midi_clip"));
const noInstSong: any = { tracks: [{ name: "Synth Lead", devices: [], clipSlots: [{ clip: { notes: [{ pitch: 60, startTime: 0, duration: 4, velocity: 100 }] } }], arrangementClips: [] }], scenes: [] };
const hcNoInst = await reg.execute("health__run_checks", {}, noInstSong);
check("health detecta MIDI con notas y sin instrumento", hcNoInst.success && hcNoInst.data.issues.some((i: any) => i.type === "midi_no_instrument"));
const tinyClipSong: any = { tracks: [{ name: "Perc", devices: [{ name: "Simpler" }], clipSlots: [{ clip: { notes: [{ pitch: 40, startTime: 0, duration: 0.1, velocity: 100 }] } }], arrangementClips: [] }], scenes: [] };
const hcTiny = await reg.execute("health__run_checks", {}, tinyClipSong);
check("health detecta clip accidentalmente corto (<1 beat)", hcTiny.success && hcTiny.data.issues.some((i: any) => i.type === "very_short_clip") && !hcTiny.data.issues.some((i: any) => i.type === "midi_no_instrument"));

// 5i. lote 8: hardware / conversión / live / routing
const nta = await post("/api/execute", { name: "notation__get_clip_notes", args: { track_index: 0, clip_index: 0 } });
check("notation__get_clip_notes", nta.success && Array.isArray(nta.data.notes) && nta.data.notes.length > 0);
const drumSong: any = { tracks: [{ name: "Drums", clipSlots: [{ clip: { name: "beat", notes: [{ pitch: 36, startTime: 0, duration: 0.5, velocity: 100 }, { pitch: 38, startTime: 1, duration: 0.5, velocity: 100 }] } }], arrangementClips: [] }], async createMidiTrack() { const t: any = { name: "", clipSlots: [], arrangementClips: [], async createMidiClip(_s: number, d: number) { const c: any = { name: "", duration: d, get notes() { return this._n || []; }, set notes(v: any) { this._n = v; } }; t._clip = c; return c; } }; this.tracks.push(t); return t; } };
const drp = await reg.execute("drumreplace__replace_drum", { track_index: 0, clip_index: 0, drum_type: "kick" }, drumSong);
check("drumreplace__replace_drum extrae los golpes reales de kick", drp.success && drp.data.advisory && drp.data.hitCount === 1);
const gar = await post("/api/execute", { name: "genarranger__generate_arrangement", args: { style: "techno" } });
check("genarranger__generate_arrangement (plan real, totalBars = suma real de secciones)", gar.success && gar.data.totalBars === 104 && gar.data.sections.reduce((a: number, s: any) => a + s.bars, 0) === 104);
const garBuild = await post("/api/execute", { name: "genarranger__generate_arrangement", args: { sections: "ambient-flow", energy_curve: "build" } });
check("genarranger respeta sections/energy_curve de verdad (no ignora los args)", garBuild.success && garBuild.data.sections.length === 5 && garBuild.data.sections[0].name === "Intro" && garBuild.data.sections[0].energy < garBuild.data.sections[garBuild.data.sections.length - 1].energy);
await post("/api/execute", { name: "genarranger__generate_arrangement", args: {} }); // reset lastPlan to the default structure for the later apply_arrangement test
const stl = await post("/api/execute", { name: "setlist__create_setlist", args: { name: "Live Set" } });
check("setlist__create_setlist", stl.success && stl.data.setlistId.startsWith("set_"));
const stlAdd = await post("/api/execute", { name: "setlist__add_song", args: { setlist_id: stl.data.setlistId, song_name: "Opener", tempo: 128 } });
check("setlist__add_song persiste de verdad (no es un eco)", stlAdd.success && stlAdd.data.songCount === 1);
const stlAdd2 = await post("/api/execute", { name: "setlist__add_song", args: { setlist_id: stl.data.setlistId, song_name: "Closer", tempo: 100 } });
const stlReorder = await post("/api/execute", { name: "setlist__reorder_setlist", args: { setlist_id: stl.data.setlistId, song_index: 1, new_position: 0 } });
check("setlist__reorder_setlist reordena de verdad", stlReorder.success && stlReorder.data.songs[0] === "Closer" && stlReorder.data.songs[1] === "Opener");
const stlList = await post("/api/execute", { name: "setlist__list_setlists", args: {} });
check("setlist__list_setlists ve el guardado", stlList.success && stlList.data.setlists.some((s: any) => s.id === stl.data.setlistId && s.songCount === 2));
await post("/api/execute", { name: "setlist__delete_setlist", args: { setlist_id: stl.data.setlistId } });

const ttReset = await post("/api/execute", { name: "tempotap__tap", args: {} });
const ttReset2 = await post("/api/execute", { name: "tempotap__tap_reset", args: {} });
check("tempotap__tap_reset limpia el historial de verdad (no devuelve 5 fijo)", ttReset2.success && ttReset2.data.tapsCleared >= 1);
const ttAfterReset = await post("/api/execute", { name: "tempotap__tap_history", args: {} });
check("tempotap tras reset no tiene taps", ttAfterReset.success && ttAfterReset.data.tapCount === 0);

const maSong: any = { tracks: [
  { name: "Ref", mixer: { volume: (() => { let v = 0.85; return { async getValue() { return v; }, async setValue(x: number) { v = x; } }; })() } },
  { name: "Quiet", mixer: { volume: (() => { let v = 0.5; return { async getValue() { return v; }, async setValue(x: number) { v = x; } }; })() } },
] };
const maMatch = await reg.execute("mixassistant__reference_match", { reference_track: 0, target_tracks: "1", match_type: "loudness", apply: true }, maSong);
check("mixassistant.reference_match ajusta el fader real (no devuelve {} vacío)", maMatch.success && maMatch.data.adjustments[0].applied === true && (await maSong.tracks[1].mixer.volume.getValue()) > 0.5);
const grp = await post("/api/execute", { name: "grouprouting__create_group", args: { name: "Drum Bus", track_indices: "0,1" } });
check("grouprouting__create_group usa createGroupTrack", grp.success && grp.data.groupCreated);
const btm = await post("/api/execute", { name: "trackmanager__bulk_action", args: { track_indices: "0,1,2", action: "mute" } });
check("trackmanager__bulk_action", btm.success && btm.data.trackCount === 3);
const tsy = await post("/api/execute", { name: "temposync__set_tempo", args: { bpm: 140 } });
check("temposync__set_tempo (namespaced, no colisión con session)", tsy.success && tsy.data.tempo === 140);

// 5j. lote 9: mezcla / utilidades / secuenciación / restauración
const mxs = await post("/api/execute", { name: "mixscene__save_scene", args: { name: "Verse Mix" } });
check("mixscene__save_scene", mxs.success && mxs.data.sceneSaved);
const cns = await post("/api/execute", { name: "console__execute_command", args: { command: "tempo" } });
check("console__execute_command (tempo)", cns.success && typeof cns.data.tempo === "number");
const cvh = await post("/api/execute", { name: "clipversions__save_version", args: { track_index: 0, clip_index: 0, label: "v1" } });
check("clipversions__save_version captura las notas reales", cvh.success && cvh.data.version.noteCount === 4 && cvh.data.totalVersions >= 1);
const rackSong: any = { tracks: [{ name: "Drums", devices: [{ name: "Drum Rack", chains: [{ receivingNote: 38 }, { receivingNote: 40 }] }] }] };
const dmp = await reg.execute("drummap__set_drum_mapping", { track_index: 0, pad_index: 0, note: 36 }, rackSong);
check("drummap__set_drum_mapping (real receivingNote write)", dmp.success && dmp.data.newNote === 36 && rackSong.tracks[0].devices[0].chains[0].receivingNote === 36);
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
const rkSong: any = { tracks: [{ name: "T", devices: [] as any[] }] };
rkSong.tracks[0].insertDevice = async (name: string) => { const d: any = { _n: name, get name() { return this._n; }, set name(v: any) { this._n = v; } }; rkSong.tracks[0].devices.push(d); return d; };
const rkb = await reg.execute("rackbuilder__create_rack", { track_index: 0, rack_type: "instrument", name: "Lead Rack" }, rkSong);
check("rackbuilder inserta un Instrument Rack real", rkb.success && rkb.data.device === "Instrument Rack" && rkSong.tracks[0].devices.length === 1 && rkSong.tracks[0].devices[0].name === "Lead Rack");
const mtf = await post("/api/execute", { name: "miditransform__apply_arpeggio", args: { track_index: 0, clip_index: 0, pattern: "updown" } });
check("miditransform__apply_arpeggio", mtf.success && mtf.data.pattern === "updown");
const mlf = await post("/api/execute", { name: "midilfo__set_lfo_multi_target", args: { track_index: 0, targets: "cutoff,res,vol" } });
check("midilfo__set_lfo_multi_target (3 targets)", mlf.success && mlf.data.targetCount === 3);

// 5m. lote 12: live / utilidades / análisis / MIDI
const lqz = await post("/api/execute", { name: "launchquant__set_global_quant", args: { value: "1/8" } });
check("launchquant__set_global_quant (advisory — no setter in SDK)", lqz.success && lqz.data.advisory && lqz.data.requestedValue === "1/8");
const sbx = await post("/api/execute", { name: "sandbox__eval_typescript", args: { code: "return song.tempo + 1;", return_value: true } });
check("sandbox__eval_typescript (eval real)", sbx.success && typeof sbx.data.result === "number");
const cgr = await post("/api/execute", { name: "clipgraph__build_graph", args: {} });
check("clipgraph__build_graph", cgr.success && cgr.data.nodeCount > 0);
const ttp = await post("/api/execute", { name: "tempotap__tap", args: {} });
check("tempotap__tap", ttp.success && ttp.data.tapRecorded);

// 5f. paleta de comandos rápidos (micro-acciones)
const qa = await post("/api/execute", { name: "quickactions__list_quick_actions", args: {} });
check("quickactions__list_quick_actions", qa.success && qa.data.total >= 80 && qa.data.actions.every((a: any) => a.tool));
const qaf = await post("/api/execute", { name: "quickactions__list_quick_actions", args: { query: "tempo" } });
check("quickactions filtra por query", qaf.success && qaf.data.count > 0 && qaf.data.count < qa.data.total);
const qrun = await post("/api/execute", { name: "quickactions__run_quick_action", args: { group: "Tempo", action: "128 BPM" } });
check("quickactions__run_quick_action resuelve a un tool real", qrun.success && qrun.data.route.name === "temposync__set_tempo");
const qbad = await post("/api/execute", { name: "quickactions__run_quick_action", args: { group: "Nope", action: "Nope" } });
check("quickactions acción inexistente → error", qbad.success === false);

// 6. errores controlados
const bad = await post("/api/execute", { name: "does__not_exist", args: {} });
check("tool inexistente → error controlado", bad.success === false && /Unknown tool/.test(bad.error));

// 7. chat sin key → 400 controlado
const chat = await post("/api/chat", { messages: [{ role: "user", content: "hola" }] });
check("chat sin API key → error claro", chat.success === false && /API key/i.test(chat.error));

// 7b. copilot meta-toolkit: find_tools alcanza toda la suite y run_tool ejecuta
const ft = bridge.findTools("generate techno drums");
check("copilot find_tools encuentra el tool real", ft.some((t: any) => t.name === "drums__generate_pattern"));
const ftHit = ft.find((t: any) => t.name === "drums__generate_pattern");
const ftRun = await reg.execute(ftHit.name, { genre: "techno" }, song);
check("copilot run_tool ejecuta lo que find_tools devuelve", ftRun.success === true);

// 7c. Resonance "Listen" pipeline (render→FFT). Demo mode proves the WAV+FFT analyzer
// end-to-end through the server without Live; the real path swaps in renderPreFxAudio.
const lis = await post("/api/listen", { demo: true });
check("resonance /api/listen demo → 30-band spectrum", lis.success && lis.data.analysis.bands.length === 30 && lis.data.analysis.peakHz > 0);
const lisMidi = await post("/api/listen", { trackIndex: 1 });
check("resonance listen rechaza pista MIDI con mensaje claro", lisMidi.success === false && /audio|resample|render/i.test(lisMidi.error));
// The frequency×track masking matrix used to live only in the panel's client JS — now it's a
// real backend tool (resonance__mask_matrix) reachable from the AI copilot's run_tool.
const mm = await post("/api/execute", { name: "resonance__mask_matrix", args: { demo: true } });
check("resonance__mask_matrix (copilot-reachable) detecta colisiones reales", mm.success && mm.data.rows.length === 6 && typeof mm.data.collisionCount === "number" && Array.isArray(mm.data.moves));

// EQ/sidechain suggestions used to always return the same fixed bands/values regardless of the
// track — now they analyze the real (or demo) rendered spectrum. The demo stem has real energy
// at 60Hz, so a real sub-rumble suggestion must show up.
const eqSug = await post("/api/execute", { name: "eq__suggest_eq", args: { track_index: 0, demo: true } });
check("eq__suggest_eq analiza el espectro real (detecta el sub-rumble del demo)", eqSug.success && !eqSug.data.advisory && eqSug.data.suggestions.some((s: any) => s.band === "low"));
const maSug = await post("/api/execute", { name: "mixassistant__suggest_eq", args: { track_index: 0, demo: true } });
check("mixassistant__suggest_eq usa el mismo análisis real", maSug.success && !maSug.data.advisory && maSug.data.suggestions.length > 0);
const scSug = await post("/api/execute", { name: "eq__get_sidechain_suggestions", args: { trigger_track: 0, target_track: 1, demo: true } });
check("eq__get_sidechain_suggestions sincroniza el release al tempo real (no 50ms fijo)", scSug.success && scSug.data.suggestions[0].release === Math.round((60000 / song.tempo / 4) * 0.9) && scSug.data.suggestions[0].release !== 50);
check("eq__get_sidechain_suggestions detecta solape real de graves (mismo demo stem = solape fuerte)", scSug.success && scSug.data.suggestions[0].lowEndOverlap > 0.5 && scSug.data.suggestions[0].ratio === 6);

// 7d. Auto-Gain Stager: demo mode proves the render→measure→plan pipeline + fader math.
const ag = await post("/api/autogain", { demo: true, targetMode: "average" });
check("autogain /api/autogain demo → plan de faders", ag.success && ag.data.tracks.length === 6 && ag.data.tracks.every((t: any) => typeof t.faderDb === "number" && typeof t.faderValue === "number"));
const agQuiet = ag.data.tracks.find((t: any) => t.name === "Synth"); // quietest stem must get a positive (boost) move toward the average
check("autogain sube las pistas por debajo de la referencia", agQuiet.faderDb > 0);
// Same pipeline, now reachable from the AI copilot as a real tool (autogain__run).
const agRun = await post("/api/execute", { name: "autogain__run", args: { demo: true, target_mode: "average" } });
check("autogain__run (copilot-reachable)", agRun.success && agRun.data.tracks.length === 6);

// Stem Export: demo writes real WAV files to disk with automatic {index}_{name} naming.
const se = await post("/api/stemexport", { demo: true });
check("stemexport /api/stemexport demo escribe WAVs reales con naming automático", se.success && se.data.files.length === 4 && se.data.files[0].fileName === "01_Kick.wav" && existsSync(se.data.files[0].file));
const seTool = await post("/api/execute", { name: "stemexport__export", args: { demo: true, name_pattern: "{name}_stem" } });
check("stemexport__export (copilot-reachable) respeta el naming pattern", seTool.success && seTool.data.files[0].fileName === "Kick_stem.wav");
const seCand = await post("/api/execute", { name: "stemexport__list_export_candidates", args: {} });
check("stemexport lista candidatos reales (audio vs MIDI)", seCand.success && seCand.data.total === song.tracks.length);

// Mix Coach: combines health + masking + gain-staging into one prioritized next-steps list.
const mc = await post("/api/mixcoach", { demo: true });
check("mixcoach /api/mixcoach combina 3 análisis reales en next steps priorizados", mc.success && Array.isArray(mc.data.nextSteps) && typeof mc.data.healthScore === "number" && typeof mc.data.maskingCollisions === "number" && mc.data.nextSteps.every((s: any) => s.action === null || (s.action.tool && s.action.args)));
const mcTool = await post("/api/execute", { name: "mixcoach__analyze", args: { demo: true } });
check("mixcoach__analyze (copilot-reachable)", mcTool.success && Array.isArray(mcTool.data.nextSteps));

// 7e. Key & Scale Detective: Krumhansl detection on a known diatonic melody.
const cmajSong: any = { rootNote: 0, scaleName: "Major", scaleMode: true, scaleIntervals: [0,2,4,5,7,9,11],
  tracks: [{ clipSlots: [{ clip: { notes: [60,64,67,72,64,60,67,64,60,55,52,60].map((pp, i) => ({ pitch: pp, startTime: i, duration: 1, velocity: 100 })) } }], arrangementClips: [] }] };
const ks = await reg.execute("keyscale__detect_key", {}, cmajSong);
check("keyscale detecta C major en una melodía diatónica", ks.success && ks.data.best.key === "C major", JSON.stringify(ks.data?.best));
check("keyscale compara con la escala de Live", ks.success && ks.data.matchesLive === true);
const fr0 = await reg.execute("keyscale__find_foreign_notes", { track_index: 0, root: 0, scale: "major" }, cmajSong);
check("keyscale: 0 notas foráneas en escala", fr0.success && fr0.data.foreignCount === 0);
cmajSong.tracks[0].clipSlots[0].clip.notes.push({ pitch: 61, startTime: 99, duration: 1, velocity: 100 }); // C#
const fr1 = await reg.execute("keyscale__find_foreign_notes", { track_index: 0, root: 0, scale: "major" }, cmajSong);
check("keyscale marca la nota foránea (C#)", fr1.success && fr1.data.foreignCount === 1 && fr1.data.foreign[0].name.startsWith("C#"));

// 7e2. Force to Global Key (conform) + project heatmap on Live's selected scale.
const cclip: any = { notes: [{ pitch: 60, startTime: 0, duration: 1, velocity: 100 }, { pitch: 61, startTime: 1, duration: 1, velocity: 100 }, { pitch: 64, startTime: 2, duration: 1, velocity: 100 }] };
const conformSong: any = { rootNote: 0, scaleMode: true, scaleName: "Major", scaleIntervals: [0,2,4,5,7,9,11], tracks: [{ name: "Lead", clipSlots: [{ clip: cclip }], arrangementClips: [] }] };
const cf = await reg.execute("keyscale__conform_to_scale", {}, conformSong);
const inScale = (p: number) => [0,2,4,5,7,9,11].includes(((p % 12) + 12) % 12);
check("keyscale conform mueve la nota foránea a la escala", cf.success && cf.data.notesMoved === 1 && cclip.notes.every((n: any) => inScale(n.pitch)));
const ph = await reg.execute("keyscale__project_heatmap", {}, conformSong);
check("keyscale project_heatmap: 100% en clave tras conformar", ph.success && ph.data.globalKey && ph.data.tracks[0].inKeyPct === 100);

// 7f. Generative Rhythm: writes notes with NATIVE probability + velocityDeviation.
const gr = await post("/api/execute", { name: "genrhythm__generate", args: { bars: 2, density: 60 } });
const grNotes = gr.success ? gr.data : null;
check("genrhythm genera un patrón", gr.success && gr.data.noteCount > 0 && gr.data.lanes.length === 3);
// re-read the written clip from the mock to confirm probability landed on the notes
const grTrack = song.tracks[gr.data.trackIndex];
const grClip = grTrack?.clipSlots?.[0]?.clip;
check("genrhythm usa probability nativa en las notas", !!grClip && grClip.notes.some((n: any) => typeof n.probability === "number" && n.probability < 1) && grClip.notes.every((n: any) => typeof n.velocityDeviation === "number"));
// A: fill engine + auto-fills + reshuffle con undo.
const grFill = await post("/api/execute", { name: "genrhythm__generate", args: { bars: 4, density: 60, fill_every: 2 } });
check("genrhythm auto-fills cada N compases", grFill.success && grFill.data.fills === 2 && grFill.data.fillEvery === 2);
const grTi = gr.data.trackIndex;
const grBefore = grClip.notes.length;
const grAf = await post("/api/execute", { name: "genrhythm__add_fill", args: { track_index: grTi, clip_index: 0, beats: 1, style: "tom" } });
check("genrhythm add_fill inserta un redoble", grAf.success && grAf.data.fillNotes > 0 && grClip.notes.length === grAf.data.totalNotes);
const grUn = await post("/api/execute", { name: "genrhythm__undo", args: { track_index: grTi, clip_index: 0 } });
check("genrhythm undo restaura el estado previo al fill", grUn.success && grClip.notes.length === grBefore);
const grRs = await post("/api/execute", { name: "genrhythm__reshuffle", args: { track_index: grTi, clip_index: 0, density: 70 } });
check("genrhythm reshuffle re-tira el patrón con undo", grRs.success && grRs.data.noteCount > 0 && grRs.data.undoDepth >= 1);

// 7g. Audio Texture Mapper: demo audio → FFT per window → MIDI notes.
const tx = await post("/api/texturemap", { demo: true, noteCount: 8 });
check("texturemap demo → notas MIDI desde audio", tx.success && tx.data.notes.length > 0 && tx.data.notes.every((n: any) => n.pitch >= 24 && n.pitch <= 100));
const txHz = await post("/api/execute", { name: "texturemap__hz_to_pitch", args: { hz: 440 } });
check("texturemap hz_to_pitch: 440 Hz → A4", txHz.success && txHz.data.pitch === 69 && txHz.data.name === "A4");

// 7h. Project Snapshot: save → diff → restore on disk (storageDirectory / temp fallback).
const t0 = song.tempo;
const sv1 = await post("/api/snapshot", { action: "save", label: "v1" });
check("snapshot save escribe en disco", sv1.success && !!sv1.data.id && sv1.data.summary.tracks > 0);
song.tempo = t0 + 11;
const sv2 = await post("/api/snapshot", { action: "save", label: "v2" });
const df = await post("/api/snapshot", { action: "diff", idA: sv1.data.id, idB: sv2.data.id });
check("snapshot diff detecta el cambio de tempo", df.success && df.data.lines.some((l: any) => /tempo/.test(l.text)));
const rs = await post("/api/snapshot", { action: "restore", id: sv1.data.id });
check("snapshot restore revierte el tempo", rs.success && song.tempo === t0);
check("snapshot restore es deshacible (Edit History)", rs.success && rs.data.tracksRestored >= 0 && typeof rs.data.markersRestored === "number");
await post("/api/snapshot", { action: "delete", id: sv1.data.id });
await post("/api/snapshot", { action: "delete", id: sv2.data.id });

// Same save/list/diff/restore pipeline, now reachable from the AI copilot as real tools
// (projectsnapshot__*) instead of only via the panel's direct /api/snapshot fetches.
const psSave = await post("/api/execute", { name: "projectsnapshot__save", args: { label: `tool-check-${Date.now()}` } });
check("projectsnapshot__save (copilot-reachable)", psSave.success && !!psSave.data.id);
const psList = await post("/api/execute", { name: "projectsnapshot__list", args: {} });
check("projectsnapshot__list incluye el guardado", psList.success && psList.data.snapshots.some((s: any) => s.id === psSave.data.id));
song.tempo = t0 + 7;
const psDiffCur = await post("/api/execute", { name: "projectsnapshot__diff_current", args: { id: psSave.data.id } });
check("projectsnapshot__diff_current detecta el cambio vs el estado en vivo", psDiffCur.success && psDiffCur.data.lines.some((l: any) => /tempo/.test(l.text)));
const psRestore = await post("/api/execute", { name: "projectsnapshot__restore", args: { id: psSave.data.id } });
check("projectsnapshot__restore revierte el tempo", psRestore.success && song.tempo === t0);
const psDel = await post("/api/execute", { name: "projectsnapshot__delete", args: { id: psSave.data.id } });
check("projectsnapshot__delete limpia el estado", psDel.success && psDel.data.deleted === true);

// 7i. Score Editor: MusicXML round-trip + get_score_data + import → clip.
const srcNotes = [{ pitch: 60, startTime: 0, duration: 1, velocity: 100 }, { pitch: 64, startTime: 1, duration: 0.5, velocity: 100 }, { pitch: 67, startTime: 1.5, duration: 0.5, velocity: 100 }, { pitch: 72, startTime: 2, duration: 2, velocity: 100 }];
const xml = toMusicXML(srcNotes, { tempo: 120, num: 4, den: 4 });
check("musicxml export es válido", /score-partwise/.test(xml) && /<step>C<\/step>/.test(xml) && /<clef>/.test(xml));
const back = fromMusicXML(xml);
check("musicxml round-trip conserva las notas", back.notes.length >= 4 && back.notes.some((n: any) => n.pitch === 60) && back.notes.some((n: any) => n.pitch === 72));
const sd = await post("/api/execute", { name: "scoreeditor__get_score_data", args: { track_index: 0, clip_index: 0 } });
check("scoreeditor get_score_data devuelve notas + compás", sd.success && Array.isArray(sd.data.notes) && sd.data.num === 4);
const imp = await post("/api/execute", { name: "scoreeditor__from_musicxml", args: { xml } });
check("scoreeditor from_musicxml crea un clip MIDI", imp.success && imp.data.noteCount >= 4);

// 7j. Clip Variation Engine + Stem Aligner.
const cvList = await post("/api/execute", { name: "clipvariations__list_transforms", args: {} });
check("clipvariations lista los transforms", cvList.success && cvList.data.transforms.length >= 6);
const cvBefore = song.tracks.length;
const cv = await post("/api/execute", { name: "clipvariations__generate_variations", args: { track_index: 0, clip_index: 0, count: 3 } });
check("clipvariations genera variaciones como clips nuevos", cv.success && cv.data.variations.length === 3 && cv.data.variations.every((v: any) => v.noteCount > 0) && song.tracks.length === cvBefore + 3);
const sa = await post("/api/stemalign", { demo: true });
check("stemalign demo detecta ~270 ms de offset", sa.success && Math.abs(sa.data.offsetMs - 270) < 60 && sa.data.confidence > 0.5);

// 7k. Sample Library Brain: index → search → find-similar → text search.
const sbIdx = await post("/api/samplebrain", { action: "index", demo: true });
check("samplebrain indexa con fingerprint", sbIdx.success && sbIdx.data.indexed === 4 && sbIdx.data.withFeatures === 4);
const sbAll = await post("/api/samplebrain", { action: "search" });
check("samplebrain search lista los samples", sbAll.success && sbAll.data.count === 4);
const sbSim = await post("/api/samplebrain", { action: "search", similarTo: "/demo/deep_sub_kick.wav", limit: 5 });
check("samplebrain find-similar ordena por cosine", sbSim.success && sbSim.data.samples[0].path === "/demo/deep_sub_kick.wav" && typeof sbSim.data.samples[0].score === "number");
const sbQ = await post("/api/samplebrain", { action: "search", query: "bass" });
check("samplebrain busca por texto/tags", sbQ.success && sbQ.data.samples.some((s: any) => s.name.includes("bass")));

// 7l. Macro Snapshot Morph: capture two device states and lerp to the midpoint.
const mkP = (name: string, v: number) => { let val = v; return { name, min: 0, max: 127, isQuantized: false, async getValue() { return val; }, async setValue(x: number) { val = x; } }; };
const mDev: any = { name: "Test Rack", parameters: [0, 10, 20, 30, 40, 50, 60, 70].map((v, i) => mkP("Macro " + (i + 1), v)) };
const macroSong: any = { tracks: [{ name: "R", devices: [mDev], clipSlots: [], arrangementClips: [] }] };
const mb = new Bridge(reg, macroSong);
const capA = await mb.macroMorph({ action: "capture", trackIndex: 0, deviceIndex: 0, label: "A" });
for (const p of mDev.parameters) await p.setValue((await p.getValue()) + 40);
const capB = await mb.macroMorph({ action: "capture", trackIndex: 0, deviceIndex: 0, label: "B" });
const mr = await mb.macroMorph({ action: "morph", trackIndex: 0, deviceIndex: 0, idA: capA.data.id, idB: capB.data.id, t: 0.5 });
const mid = await mDev.parameters[0].getValue();
check("macromorph captura + interpola al punto medio", capA.success && capB.success && mr.success && mr.data.paramsSet === 8 && mid === 20);

// 7m. Loop Detect + Warp Compare (demo) + Param Diff + Phrase Finder.
const ldD = await post("/api/loopdetect", { demo: true });
check("loopdetect demo estima BPM + candidatos", ldD.success && ldD.data.detectedBpm > 0 && ldD.data.candidates.length > 0);
const wcD = await post("/api/warpcompare", { demo: true });
check("warpcompare demo lista los 6 warp modes", wcD.success && wcD.data.modes.length === 6 && wcD.data.modes[5].name === "Complex Pro");
const mkP2 = (name: string, v: number) => { let val = v; return { name, min: 0, max: 1, isQuantized: false, async getValue() { return val; }, async setValue(x: number) { val = x; } }; };
const eqDev = (g: number) => ({ name: "EQ Eight", parameters: [mkP2("Gain A", g), mkP2("Freq", 0.5)] });
const pdSong: any = { tracks: [{ name: "T0", devices: [eqDev(0.5)] }, { name: "T1", devices: [eqDev(0.5)] }, { name: "T2", devices: [eqDev(0.5)] }, { name: "T3", devices: [eqDev(0.9)] }] };
const pd = await reg.execute("paramdiff__diff_devices", { track_indices: "0,1,2,3" }, pdSong);
check("paramdiff detecta el outlier (track 3)", pd.success && pd.data.groups.length === 1 && pd.data.groups[0].params.some((p: any) => p.name === "Gain A" && p.outliers.includes(3)));
const pn = await reg.execute("paramdiff__normalize_param", { track_indices: "0,1,2,3", device_name: "EQ Eight", param_name: "Gain A" }, pdSong);
check("paramdiff normalize iguala a la media", pn.success && Math.abs((await pdSong.tracks[3].devices[0].parameters[0].getValue()) - pn.data.mean) < 1e-9);
const phSong: any = { tracks: [{ name: "Bass", clipSlots: [{ clip: { name: "Groove", color: 0, notes: [36, 43, 48, 43].map((p, i) => ({ pitch: p, startTime: i, duration: 1, velocity: 100 })) } }], arrangementClips: [] }] };
const pfRes = await reg.execute("phrasefinder__find_phrase", { pattern: "0,7,12,7", transpose_aware: true }, phSong);
check("phrasefinder encuentra el patrón de intervalos", pfRes.success && pfRes.data.count === 1 && pfRes.data.matches[0].trackIndex === 0);
const pfHl = await reg.execute("phrasefinder__highlight_match", { track_index: 0, clip_index: 0, color: 16 }, phSong);
check("phrasefinder highlight pinta el clip", pfHl.success && phSong.tracks[0].clipSlots[0].clip.color === 16);

// 7n. Safe Randomizer (#5) + Groove Template (#1) + Probability Lab (#6).
const srD = await post("/api/saferandom", { demo: true, action: "randomize", amount: 30 });
check("saferandom demo respeta el lock", srD.success && srD.data.params[3].locked === true && srD.data.params[3].value === 54);
const mkP3 = (name: string, v: number) => { let val = v; return { name, min: 0, max: 127, isQuantized: false, async getValue() { return val; }, async setValue(x: number) { val = x; } }; };
const srDev: any = { name: "Synth", parameters: [mkP3("A", 60), mkP3("B", 60), mkP3("C", 60)] };
const srSong: any = { tracks: [{ name: "S", devices: [srDev] }] };
const srb = new Bridge(reg, srSong);
const rr = await srb.safeRandomize({ action: "randomize", trackIndex: 0, deviceIndex: 0, amount: 50 });
check("saferandom modifica params reales", rr.success && rr.data.paramsChanged === 3);
const srReset = await srb.safeRandomize({ action: "reset", trackIndex: 0, deviceIndex: 0 });
check("saferandom reset restaura el estado previo", srReset.success && (await srDev.parameters[0].getValue()) === 60);
// instrument-aware layer (A): section targeting + smart guard for global params.
const srCatDev: any = { name: "Analog", parameters: [mkP3("Filter Freq", 60), mkP3("Volume", 60), mkP3("Osc Detune", 60)] };
const srCatB = new Bridge(reg, { tracks: [{ name: "S", devices: [srCatDev] }] } as any);
const srCat = await srCatB.safeRandomize({ action: "randomize", trackIndex: 0, deviceIndex: 0, amount: 60, category: "filter" });
check("saferandom categoría = solo la sección filter", srCat.success && srCat.data.paramsChanged === 1 && (await srCatDev.parameters[0].getValue()) !== 60 && (await srCatDev.parameters[1].getValue()) === 60 && (await srCatDev.parameters[2].getValue()) === 60);
const srSmartDev: any = { name: "Wavetable", parameters: [mkP3("Cutoff", 60), mkP3("Volume", 60)] };
const srSmartB = new Bridge(reg, { tracks: [{ name: "S", devices: [srSmartDev] }] } as any);
const srSmart = await srSmartB.safeRandomize({ action: "randomize", trackIndex: 0, deviceIndex: 0, amount: 60, smart: true });
check("saferandom smart mantiene Volume musical", srSmart.success && (await srSmartDev.parameters[1].getValue()) === 60 && srSmart.data.skipped >= 1);
// Stub cleanup: ex-fake tools now do real SDK work (insertDevice / notes / locators / tracks).
const hnSong: any = { tracks: [{ name: "K", clipSlots: [{ clip: { name: "c", get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: [{ pitch: 60, startTime: 0, duration: 1, velocity: 100 }] } }], arrangementClips: [] }] };
const hn = await reg.execute("harmonizer__harmonize_note", { track_index: 0, clip_index: 0, interval: "M3", voices: 2 }, hnSong);
check("harmonizer.harmonize_note añade voces reales al clip", hn.success && hn.data.harmonyNotesAdded === 2 && hnSong.tracks[0].clipSlots[0].clip.notes.length === 3);
const devSong = () => { const s: any = { tracks: [{ name: "T", devices: [] as any[] }] }; s.tracks[0].insertDevice = async (n: string) => { const d: any = { _n: n, get name() { return this._n; }, set name(v: any) { this._n = v; } }; s.tracks[0].devices.push(d); return d; }; return s; };
const vcS = devSong(); const vc = await reg.execute("vocal__setup_chain", { track_index: 0 }, vcS);
check("vocal.setup_chain inserta devices reales", vc.success && vc.data.deviceCount >= 3 && vcS.tracks[0].devices.length >= 3);
const fxS = devSong(); const fxp = await reg.execute("fxpresets__apply_fx_preset", { track_index: 0, preset_name: "Warm Bass" }, fxS);
check("fxpresets.apply inserta la cadena real", fxp.success && fxS.tracks[0].devices.length === 3 && fxS.tracks[0].devices[0].name === "EQ Eight");
const gaSong: any = { cuePoints: [] as any[] }; gaSong.createCuePoint = async (time: number) => { const c: any = { time, _n: "", get name() { return this._n; }, set name(v: any) { this._n = v; } }; gaSong.cuePoints.push(c); return c; }; gaSong.deleteCuePoint = async (c: any) => { const i = gaSong.cuePoints.indexOf(c); if (i >= 0) gaSong.cuePoints.splice(i, 1); };
const gaArr = await reg.execute("genarranger__apply_arrangement", {}, gaSong);
check("genarranger.apply suelta locators reales", gaArr.success && gaArr.data.sections === 8 && gaSong.cuePoints.length === 8 && gaSong.cuePoints[0].name === "Intro");
const tmSong: any = { tracks: [] as any[] };
const tmMakeTrack = () => { const t: any = { _n: "", devices: [] as any[], get name() { return this._n; }, set name(v: any) { this._n = v; }, async insertDevice(dn: string) { const d = { name: dn }; this.devices.push(d); return d; } }; tmSong.tracks.push(t); return t; };
tmSong.createMidiTrack = async () => tmMakeTrack();
tmSong.createAudioTrack = async () => tmMakeTrack();
const tm = await reg.execute("templates__apply_template", { genre: "electronic" }, tmSong);
check("templates.apply (wizard de un clic) crea tracks + device chains reales", tm.success && tm.data.tracksCreated === 4 && tmSong.tracks.length === 4 && tmSong.tracks[0].name === "Kick" && tm.data.tracks[0].devices.includes("Drum Rack"));
const tmExtract = await reg.execute("templates__extract_template", { name: "My Electronic Set" }, tmSong);
check("templates.extract lee la estructura real del proyecto (no datos falsos)", tmExtract.success && tmExtract.data.structure.length === 4 && tmExtract.data.structure[0].devices.includes("Drum Rack"));
const tmApplySaved = await reg.execute("templates__apply_template", { template_id: tmExtract.data.id }, tmSong);
check("templates.apply reconstruye desde una plantilla guardada", tmApplySaved.success && tmApplySaved.data.templateName === "My Electronic Set" && tmSong.tracks.length === 8);
const tmList = await reg.execute("templates__list_templates", {}, tmSong);
check("templates.list incluye los built-in + el guardado", tmList.success && tmList.data.templates.some((t: any) => t.builtin && t.genre === "electronic") && tmList.data.templates.some((t: any) => t.id === tmExtract.data.id));

const gtSong: any = { tempo: 120, tracks: [
  { name: "Src", clipSlots: [{ clip: { name: "groove", notes: [{ pitch: 36, startTime: 0, duration: 0.25, velocity: 100 }, { pitch: 38, startTime: 0.52, duration: 0.25, velocity: 90 }, { pitch: 36, startTime: 1.0, duration: 0.25, velocity: 100 }, { pitch: 38, startTime: 1.52, duration: 0.25, velocity: 90 }] } }], arrangementClips: [] },
  { name: "Tgt", clipSlots: [{ clip: { name: "straight", get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: [{ pitch: 60, startTime: 0, duration: 0.25, velocity: 100 }, { pitch: 62, startTime: 0.5, duration: 0.25, velocity: 100 }, { pitch: 60, startTime: 1.0, duration: 0.25, velocity: 100 }, { pitch: 62, startTime: 1.5, duration: 0.25, velocity: 100 }] } }], arrangementClips: [] },
] };
const ge = await reg.execute("groovetemplate__extract_template", { track_index: 0, clip_index: 0 }, gtSong);
check("groovetemplate extrae el swing de la fuente", ge.success && ge.data.swingMs > 5);
const ga = await reg.execute("groovetemplate__apply_template", { target_track: 1, target_clip: 0, source_track: 0, source_clip: 0, strength: 100 }, gtSong);
check("groovetemplate aplica el groove (mueve notas)", ga.success && ga.data.notesMoved >= 1);
const tnote = gtSong.tracks[1].clipSlots[0].clip.notes.find((n: any) => Math.abs(n.startTime - 0.52) < 0.02);
check("groovetemplate empuja la off-beat al groove de la fuente", !!tnote);
// B: pocket lock por elemento — el kick (36) excluido mantiene su timing recto.
const gtKickSong: any = { tempo: 120, tracks: [
  { name: "Src", clipSlots: [{ clip: { name: "g", notes: [{ pitch: 42, startTime: 0.52, duration: 0.25, velocity: 90 }, { pitch: 42, startTime: 1.52, duration: 0.25, velocity: 90 }] } }], arrangementClips: [] },
  { name: "Tgt", clipSlots: [{ clip: { name: "t", get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: [{ pitch: 36, startTime: 0.5, duration: 0.25, velocity: 100 }, { pitch: 42, startTime: 0.5, duration: 0.25, velocity: 100 }] } }], arrangementClips: [] },
] };
const gtEx = await reg.execute("groovetemplate__apply_template", { target_track: 1, target_clip: 0, source_track: 0, source_clip: 0, strength: 100, exclude_pitches: "36" }, gtKickSong);
const gtNotes = gtKickSong.tracks[1].clipSlots[0].clip.notes;
const gtKick = gtNotes.find((n: any) => n.pitch === 36), gtHat = gtNotes.find((n: any) => n.pitch === 42);
check("groovetemplate saca el kick del pocket (queda recto)", gtEx.success && gtEx.data.notesLocked === 1 && gtKick.startTime === 0.5 && gtHat.startTime > 0.5);
// B: dinámica por lane — centra velocity y escribe velocityDeviation nativo por elemento.
const gtDynSong: any = { tracks: [{ name: "Drums", clipSlots: [{ clip: { name: "d", get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: [{ pitch: 36, startTime: 0, duration: 0.25, velocity: 70 }, { pitch: 42, startTime: 0.25, duration: 0.25, velocity: 70 }] } }], arrangementClips: [] }] };
const gtDyn = await reg.execute("groovetemplate__set_lane_dynamics", { track_index: 0, clip_index: 0, lanes: "36:96-104,42:55-95:18" }, gtDynSong);
const dn = gtDynSong.tracks[0].clipSlots[0].clip.notes;
check("groovetemplate fija dinámica por elemento (deviation nativo)", gtDyn.success && gtDyn.data.affected === 2 && dn[0].velocity === 100 && dn[0].velocityDeviation === 4 && dn[1].velocity === 75 && dn[1].velocityDeviation === 18);

const plBefore = song.tracks.length;
const pl = await post("/api/execute", { name: "probabilitylab__generate", args: { track_index: 0, clip_index: 0, count: 3 } });
check("probabilitylab genera variaciones con probability/releaseVel", pl.success && pl.data.variations.length === 3 && song.tracks.length === plBefore + 3 && pl.data.variations.some((v: any) => v.usesProbability || v.usesReleaseVel));

// 7o. Pendientes nuevas: #2 Velocity Compressor, #10 Range Auto-Transposer, #3 Color Theory, #8 Take Lane Organizer, #7 Audio→MIDI.
const mkClip = (notes: any[], extra: any = {}) => ({ name: "C", color: 0, get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: notes, ...extra });
const vcSong: any = { tracks: [{ name: "Keys", clipSlots: [{ clip: mkClip([100, 120, 64, 110].map((v, i) => ({ pitch: 60, startTime: i, duration: 1, velocity: v }))) }], arrangementClips: [] }] };
const vcA = await reg.execute("velocompress__analyze", { track_index: 0, clip_index: 0 }, vcSong);
check("velocompress analiza el histograma", vcA.success && vcA.data.count === 4 && vcA.data.max === 120);
const vcC = await reg.execute("velocompress__compress", { track_index: 0, clip_index: 0, threshold: 90, ratio: 2 }, vcSong);
check("velocompress baja los picos sobre el umbral", vcC.success && vcC.data.after.max < 120 && vcSong.tracks[0].clipSlots[0].clip.notes[1].velocity < 120);

const trSong: any = { tracks: [{ name: "Lead", clipSlots: [{ clip: mkClip([80, 84, 88].map((p, i) => ({ pitch: p, startTime: i, duration: 1, velocity: 100 }))) }], arrangementClips: [] }] };
const trS = await reg.execute("transposer__suggest", { track_index: 0, clip_index: 0, low: 48, high: 72 }, trSong);
check("transposer recomienda bajar al registro objetivo", trS.success && trS.data.best.semitones < 0 && trS.data.best.inRange >= 2);
const trA = await reg.execute("transposer__apply", { track_index: 0, clip_index: 0, semitones: trS.data.best.semitones }, trSong);
check("transposer aplica el shift a las notas", trA.success && trSong.tracks[0].clipSlots[0].clip.notes[0].pitch === 80 + trS.data.best.semitones);

const ctP = await reg.execute("colortheory__palette", { base_hex: "#FF8C00", scheme: "triadic", count: 3 }, song);
check("colortheory genera una paleta triádica", ctP.success && ctP.data.swatches.length === 3 && /^#[0-9a-f]{6}$/i.test(ctP.data.swatches[0].hex));
const ctSong: any = { tracks: [{ name: "T", clipSlots: [{ clip: mkClip([]) }, { clip: mkClip([]) }], arrangementClips: [] }] };
const ctApply = await reg.execute("colortheory__apply_to_track", { track_index: 0, scheme: "triadic" }, ctSong);
check("colortheory escribe clip.color real", ctApply.success && ctApply.data.colored === 2 && ctSong.tracks[0].clipSlots[0].clip.color > 0);

const tlSong: any = { tracks: [{ name: "Vox", takeLanes: [
  { _n: "", get name() { return (this as any)._n; }, set name(v: any) { (this as any)._n = v; }, clips: [{ notes: [{ pitch: 60 }, { pitch: 64 }] }] },
  { _n: "", get name() { return (this as any)._n; }, set name(v: any) { (this as any)._n = v; }, clips: [{ notes: [{ pitch: 40 }] }] },
] }] };
const tlL = await reg.execute("takeorganizer__list", { track_index: 0 }, tlSong);
check("takeorganizer enumera las take lanes", tlL.success && tlL.data.laneCount === 2 && tlL.data.lanes[0].notes === 2);
const tlA = await reg.execute("takeorganizer__autolabel", { track_index: 0, scheme: "content" }, tlSong);
check("takeorganizer renombra por contenido", tlA.success && tlSong.tracks[0].takeLanes[1].name.includes("Bass"));

const a2m = await post("/api/audio2midi", { demo: true });
check("audio2midi transcribe el demo monofónico", a2m.success && a2m.data.noteCount >= 4 && a2m.data.notes[0].pitch >= 48);

// 7q. Müsslin-inspired: Bass Engine (#1), expressive chords (#3), generative arp (#2).
const beGen = await post("/api/execute", { name: "bassengine__generate", args: { root: "C", scale: "minor", style: "octave", bars: 2, density: 80, ghosts: 50 } });
check("bassengine genera una bassline en rango de bajo", beGen.success && beGen.data.noteCount > 0 && beGen.data.baseNote >= 24 && beGen.data.baseNote <= 48);
const beMut = await post("/api/execute", { name: "bassengine__mutate", args: { track_index: beGen.data.trackIndex, clip_index: 0, amount: 50 } });
check("bassengine mutate conserva el conteo de notas (undoable)", beMut.success && beMut.data.noteCount === beGen.data.noteCount);
const hcx = await post("/api/execute", { name: "harmonizer__generate_expressive", args: { key: "C", scale: "minor", degrees: "i,iv,v", complexity: "7th", spread: "open" } });
check("harmonizer genera acordes expresivos (7th, 3 acordes)", hcx.success && hcx.data.chords.length === 3 && hcx.data.chords[0].tones.length === 4 && hcx.data.noteCount === 12);
const arp = await post("/api/execute", { name: "miditransform__generate_arp", args: { root: "C", chord: "min7", bars: 2, variations: 3 } });
check("miditransform genera arpegios con N variaciones distintas", arp.success && arp.data.arps.length === 3 && arp.data.arps[0].noteCount > 0 && arp.data.arps[0].pattern !== arp.data.arps[1].pattern);

// 7r. federico-pepe-inspired: chord detection (#1), set-wide transpose (#2), Session→Arrangement (#3).
const dcSong: any = { tracks: [{ name: "Keys", clipSlots: [{ clip: { name: "prog", notes: [
  { pitch: 60, startTime: 0, duration: 1, velocity: 100 }, { pitch: 64, startTime: 0, duration: 1, velocity: 100 }, { pitch: 67, startTime: 0, duration: 1, velocity: 100 },
  { pitch: 57, startTime: 2, duration: 1, velocity: 100 }, { pitch: 60, startTime: 2, duration: 1, velocity: 100 }, { pitch: 64, startTime: 2, duration: 1, velocity: 100 },
] } }], arrangementClips: [] }] };
const dc = await reg.execute("harmonizer__detect_chords", { track_index: 0, clip_index: 0 }, dcSong);
check("harmonizer detecta C → Am en el clip", dc.success && dc.data.chordCount === 2 && dc.data.chords[0].chord === "C" && dc.data.chords[1].chord === "Am");
const taSong: any = { tracks: [
  { name: "A", clipSlots: [{ clip: { name: "a", get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: [{ pitch: 60, startTime: 0, duration: 1, velocity: 100 }] } }], arrangementClips: [] },
  { name: "B", clipSlots: [{ clip: { name: "b", get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: [{ pitch: 48, startTime: 0, duration: 1, velocity: 100 }] } }], arrangementClips: [] },
] };
const ta = await reg.execute("transposer__transpose_all", { semitones: 3 }, taSong);
check("transposer transpone todos los clips del set", ta.success && ta.data.clipsAffected === 2 && taSong.tracks[0].clipSlots[0].clip.notes[0].pitch === 63 && taSong.tracks[1].clipSlots[0].clip.notes[0].pitch === 51);
const mkBridgeTrack = (name: string, clip: any) => { const t: any = { name, clipSlots: [{ clip }], arrangementClips: [] }; t.createMidiClip = async (start: number, dur: number) => { const c: any = { name: "", _n: [], get notes() { return this._n; }, set notes(v: any) { this._n = v; }, duration: dur, startTime: start }; t.arrangementClips.push(c); return c; }; return t; };
const sbSong: any = { tracks: [mkBridgeTrack("T1", { name: "loop", notes: [{ pitch: 60, startTime: 0, duration: 1, velocity: 100 }], duration: 4 })] };
const sb = await reg.execute("sessionbridge__flatten", {}, sbSong);
check("sessionbridge vuelca el clip de session a arrangement", sb.success && sb.data.clipsCopied === 1 && sbSong.tracks[0].arrangementClips.length === 1 && sbSong.tracks[0].arrangementClips[0].notes.length === 1);

// 7s. pnomolos-inspired: suggest next chord (#1), groove-from-audio (#2), pattern DSL (#3).
const sn = await reg.execute("harmonizer__suggest_next", { key: "C", scale: "major", current: "V" }, { tracks: [] });
check("harmonizer sugiere la resolución V→I", sn.success && sn.data.suggestions.some((s: any) => s.roman === "I" && s.chord === "C"));
const gfa = await post("/api/groovefromaudio", { demo: true });
check("groove-from-audio detecta onsets y swing del loop", gfa.success && gfa.data.onsets > 0 && gfa.data.swingMs > 0);
const pl2 = await post("/api/execute", { name: "patternlang__compile", args: { pattern: "c3 e3 [g3 b3] c4", bars: 1 } });
check("patternlang compila la mini-notación a notas", pl2.success && pl2.data.noteCount === 5 && pl2.data.notes.some((n: any) => n.pitch === 48));

// 7t. Quick Actions: catálogo curado + resolución de ruta a un tool real.
const qaList = await post("/api/execute", { name: "quickactions__list_quick_actions", args: {} });
check("quickactions lista los 83 presets", qaList.success && qaList.data.total === 83 && qaList.data.actions.every((a: any) => typeof a.tool === "string" && a.tool.includes("__")));
const qaRun = await post("/api/execute", { name: "quickactions__run_quick_action", args: { group: "Tempo", action: "128 BPM" } });
check("quickactions resuelve una ruta a su tool real", qaRun.success && qaRun.data.route.name === "temposync__set_tempo" && qaRun.data.route.args.bpm === 128);

// 7u. Midnight-inspired: chord variations with locks, comping "feel", mood presets.
const vp = await reg.execute("harmonizer__vary_progression", { key: "C", scale: "major", degrees: "I,V,vi,IV", lock: "0", variations: 2, write: false }, { tracks: [] });
check("harmonizer vary_progression respeta los locks", vp.success && vp.data.variations.length === 2 && vp.data.variations.every((v: any) => v.chords[0].locked === true && v.chords[0].roman === "I"));
const compSong: any = { tracks: [{ name: "Ch", clipSlots: [{ clip: { name: "c", get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: [{ pitch: 60, startTime: 0, duration: 4, velocity: 90 }, { pitch: 64, startTime: 0, duration: 4, velocity: 90 }, { pitch: 67, startTime: 0, duration: 4, velocity: 90 }] } }], arrangementClips: [] }] };
const comp = await reg.execute("harmonizer__apply_comp", { track_index: 0, clip_index: 0, style: "charleston" }, compSong);
check("harmonizer apply_comp aplica el comping (Charleston = 2 golpes × 3 voces)", comp.success && comp.data.noteCount === 6 && compSong.tracks[0].clipSlots[0].clip.notes.length === 6);
const moodGen = await post("/api/execute", { name: "harmonizer__generate_expressive", args: { scale: "major", mood: "happy" } });
check("harmonizer mood preset genera la progresión (happy = 4 acordes)", moodGen.success && moodGen.data.chords.length === 4);

// 7v. xmllint-inspired: cue-point song-structure templates + locator management.
const cuePts: any[] = [];
const cueSong: any = { tempo: 120, cuePoints: cuePts, createCuePoint: async (time: number) => { const c: any = { time, _n: "", get name() { return this._n; }, set name(v: any) { this._n = v; } }; cuePts.push(c); return c; }, deleteCuePoint: async (c: any) => { const i = cuePts.indexOf(c); if (i >= 0) cuePts.splice(i, 1); } };
const cueT = await reg.execute("arrangement__apply_cue_template", { genre: "edm", set_tempo: 128 }, cueSong);
check("arrangement suelta la plantilla EDM como locators", cueT.success && cueT.data.sections === 7 && cueSong.cuePoints.length === 7 && cueSong.cuePoints[0].name === "Intro" && cueSong.tempo === 128);
const cueRn = await reg.execute("arrangement__rename_marker", { index: 0, name: "Cold open" }, cueSong);
check("arrangement renombra un locator por índice", cueRn.success && cueSong.cuePoints[0].name === "Cold open");
const cueClr = await reg.execute("arrangement__clear_markers", {}, cueSong);
check("arrangement clear_markers borra todos los locators", cueClr.success && cueClr.data.removed === 7 && cueSong.cuePoints.length === 0);

// 7w. akstretch-inspired: in-host time-stretch (OLA keeps length≈ratio, varispeed too).
const tsOla = await post("/api/timestretch", { demo: true, ratio: 2, mode: "ola", grain: 1024 });
check("timestretch OLA duplica la longitud (preserva pitch)", tsOla.success && tsOla.data.mode === "ola" && Math.abs(tsOla.data.outSamples / tsOla.data.inSamples - 2) < 0.06 && tsOla.data.waveOut.length > 0);
const tsVari = await post("/api/timestretch", { demo: true, ratio: 0.5, mode: "varispeed" });
check("timestretch varispeed acorta a la mitad", tsVari.success && tsVari.data.mode === "varispeed" && Math.abs(tsVari.data.outSamples / tsVari.data.inSamples - 0.5) < 0.02);

// 7x. KOOBCeW-inspired: in-host drum synthesis (kick/snare/clap/hat) → WAV + audition URL.
const dsKick = await post("/api/drumsynth", { demo: true, type: "kick", params: { tune: 150 } });
check("drumsynth sintetiza un kick con waveform + audio", dsKick.success && dsKick.data.type === "kick" && dsKick.data.durSec > 0 && dsKick.data.wave.length > 0 && /drumsynthaudio/.test(dsKick.data.audio));
const dsSnare = await post("/api/drumsynth", { demo: true, type: "snare" });
const dsAudio = await fetch(base + dsSnare.data.audio);
check("drumsynth sirve el WAV para audición", dsSnare.success && dsAudio.ok && (dsAudio.headers.get("content-type") || "").includes("audio/wav"));

// 7y. JS-dev-inspired: Slice Lab (slice+FX), Mosaic (seeded variations), Riser (sweep synth).
const slab = await post("/api/slicelab", { demo: true, slices: 8, lanes: { order: [3, 1, 7, 0, 5, 2, 6, 4], reverse: [1, 0, 1, 0, 1, 0, 1, 0], pitch: [0, 7, 0, -5, 0, 12, 0, 0] }, filter: { mode: "lp", cutoff: 1200, res: 0.3, sweep: -0.5 } });
check("slicelab corta y reordena en un loop nuevo", slab.success && slab.data.slices === 8 && slab.data.order[0] === 3 && slab.data.waveOut.length > 0 && /audioout/.test(slab.data.audio));
const mos = await post("/api/mosaic", { demo: true, slices: 8, variations: 4, seed: 7 });
const mos2 = await post("/api/mosaic", { demo: true, slices: 8, variations: 4, seed: 7 });
check("mosaic genera N variaciones reproducibles por seed", mos.success && mos.data.results.length === 4 && JSON.stringify(mos.data.results[0].order) === JSON.stringify(mos2.data.results[0].order));
const ris = await post("/api/riser", { demo: true, params: { source: "mix", length: 2, startNote: 45, endNote: 69, filter: "lp", filterDir: "up" } });
const risAudio = await fetch(base + ris.data.audio);
check("riser sintetiza un sweep y sirve el WAV", ris.success && ris.data.durSec > 1.5 && ris.data.wave.length > 0 && risAudio.ok && (risAudio.headers.get("content-type") || "").includes("audio/wav"));
const e8 = await post("/api/sub808", { demo: true, params: { note: 24, decay: 0.8, drive: 0.5 } });
const e8Audio = await fetch(base + e8.data.audio);
check("sub808 sintetiza un 808 afinado y sirve el WAV", e8.success && e8.data.note === 24 && e8.data.durSec > 0.5 && e8.data.wave.length > 0 && e8Audio.ok && (e8Audio.headers.get("content-type") || "").includes("audio/wav"));
const padR = await post("/api/pad", { demo: true, params: { note: 48, chord: "min7", length: 3 } });
check("padengine sintetiza un pad de acorde", padR.success && padR.data.chord === "min7" && padR.data.durSec > 2 && padR.data.wave.length > 0 && /audioout/.test(padR.data.audio));
const pkR = await post("/api/pluck", { demo: true, params: { note: 48, chord: "min7", length: 2 } });
const pkAudio = await fetch(base + pkR.data.audio);
check("pluckengine sintetiza un strum y sirve el WAV", pkR.success && pkR.data.durSec > 1 && pkR.data.wave.length > 0 && pkAudio.ok && (pkAudio.headers.get("content-type") || "").includes("audio/wav"));
const acR = await post("/api/acid", { demo: true, params: { note: 36, bpm: 130, bars: 1 } });
check("acid303 sintetiza una línea acid", acR.success && acR.data.bars === 1 && acR.data.durSec > 1 && acR.data.wave.length > 0 && /audioout/.test(acR.data.audio));
const stR = await post("/api/stab", { demo: true, params: { note: 48, chord: "min7" } });
check("chordstab sintetiza un stab", stR.success && stR.data.chord === "min7" && stR.data.wave.length > 0);
const blR = await post("/api/bell", { demo: true, params: { note: 60, ratio: 2, index: 5 } });
check("fmbell sintetiza una campana FM", blR.success && blR.data.note === 60 && blR.data.durSec > 0.5 && blR.data.wave.length > 0);
const imR = await post("/api/impact", { demo: true, params: { note: 28, length: 1.6 } });
const imAudio = await fetch(base + imR.data.audio);
check("impact sintetiza un boom y sirve el WAV", imR.success && imR.data.durSec > 1 && imR.data.wave.length > 0 && imAudio.ok && (imAudio.headers.get("content-type") || "").includes("audio/wav"));
const sbR = await post("/api/subbass", { demo: true, params: { note: 28, length: 1.5, harmonics: 40 } });
check("subbass sintetiza un sub tonal", sbR.success && sbR.data.note === 28 && sbR.data.durSec > 1 && sbR.data.wave.length > 0 && /audioout/.test(sbR.data.audio));
const ogR = await post("/api/organ", { demo: true, params: { note: 48, chord: "maj", registration: "jazz" } });
check("organ sintetiza un acorde de órgano", ogR.success && ogR.data.chord === "maj" && ogR.data.durSec > 1 && ogR.data.wave.length > 0);
const vchR = await post("/api/vocalchop", { demo: true, params: { note: 60, vowel: "a", bars: 1 } });
const vchAudio = await fetch(base + vchR.data.audio);
check("vocalchop sintetiza un chop y sirve el WAV", vchR.success && vchR.data.vowel === "a" && vchR.data.wave.length > 0 && vchAudio.ok && (vchAudio.headers.get("content-type") || "").includes("audio/wav"));
const brR = await post("/api/brass", { demo: true, params: { note: 55, chord: "maj" } });
check("brass sintetiza un acorde de brass", brR.success && brR.data.chord === "maj" && brR.data.durSec > 0.5 && brR.data.wave.length > 0);
const woR = await post("/api/wobble", { demo: true, params: { note: 36, bpm: 140, bars: 1 } });
check("wobble sintetiza un bajo wobble", woR.success && woR.data.bars === 1 && woR.data.durSec > 1 && woR.data.wave.length > 0);
const choR = await post("/api/choir", { demo: true, params: { note: 60, chord: "maj", vowel: "a" } });
check("choir sintetiza un pad coral", choR.success && choR.data.chord === "maj" && choR.data.durSec > 1 && choR.data.wave.length > 0);
const sdR = await post("/api/subdrop", { demo: true, params: { startNote: 48, endNote: 24, length: 2 } });
const sdAudio = await fetch(base + sdR.data.audio);
check("subdrop sintetiza un drop y sirve el WAV", sdR.success && sdR.data.durSec > 1 && sdR.data.wave.length > 0 && sdAudio.ok && (sdAudio.headers.get("content-type") || "").includes("audio/wav"));
// Instrument Render: cablea un clip MIDI a un motor (demo melody → pluck).
const renR = await post("/api/render", { demo: true, engine: "pluck" });
check("instrumentrender renderiza la melodía demo con un motor", renR.success && renR.data.engine === "pluck" && renR.data.noteCount === 6 && renR.data.durSec > 1 && renR.data.wave.length > 0 && /audioout/.test(renR.data.audio));
const pbR = await post("/api/pluckbass", { demo: true, params: { note: 36 } });
check("pluckbass sintetiza un pluck de bajo", pbR.success && pbR.data.note === 36 && pbR.data.wave.length > 0);
const slR = await post("/api/sawlead", { demo: true, params: { note: 60, voices: 5 } });
check("sawlead sintetiza un supersaw", slR.success && slR.data.note === 60 && slR.data.wave.length > 0);
const reR = await post("/api/reese", { demo: true, params: { note: 36, length: 2 } });
check("reese sintetiza un bajo Reese", reR.success && reR.data.note === 36 && reR.data.durSec > 1.5 && reR.data.wave.length > 0);
const maR = await post("/api/marimba", { demo: true, params: { note: 60 } });
check("marimba sintetiza una nota de mallet", maR.success && maR.data.note === 60 && maR.data.wave.length > 0);
const glR = await post("/api/glitch", { demo: true, params: { bpm: 130, bars: 1, seed: 42 } });
check("glitch sintetiza un FX con seed", glR.success && glR.data.bars === 1 && glR.data.seed === 42 && glR.data.wave.length > 0);
const thR = await post("/api/tapehiss", { demo: true, params: { length: 2 } });
const thAudio = await fetch(base + thR.data.audio);
check("tapehiss sintetiza un noise bed y sirve el WAV", thR.success && thR.data.durSec > 1 && thR.data.wave.length > 0 && thAudio.ok && (thAudio.headers.get("content-type") || "").includes("audio/wav"));
// Instrument Render con los motores melódicos nuevos.
const renBass = await post("/api/render", { demo: true, engine: "pluckbass" });
check("instrumentrender funciona con pluckbass", renBass.success && renBass.data.engine === "pluckbass" && renBass.data.noteCount === 6);
const renLead = await post("/api/render", { demo: true, engine: "marimba" });
check("instrumentrender funciona con marimba", renLead.success && renLead.data.engine === "marimba" && renLead.data.noteCount === 6);
const trR = await post("/api/trumpet", { demo: true, params: { note: 65 } });
check("trumpet sintetiza un solo de brass", trR.success && trR.data.note === 65 && trR.data.wave.length > 0);
const epR = await post("/api/epiano", { demo: true, params: { note: 60 } });
check("epiano sintetiza un Rhodes/DX7", epR.success && epR.data.note === 60 && epR.data.wave.length > 0);
const mbR = await post("/api/musicbox", { demo: true, params: { note: 72 } });
check("musicbox sintetiza un tine", mbR.success && mbR.data.note === 72 && mbR.data.wave.length > 0);
const hpR = await post("/api/harp", { demo: true, params: { note: 60, chord: "maj" } });
check("harp sintetiza un strum", hpR.success && hpR.data.chord === "maj" && hpR.data.wave.length > 0);
const whR = await post("/api/whistle", { demo: true, params: { note: 72 } });
check("whistle sintetiza un silbido", whR.success && whR.data.note === 72 && whR.data.wave.length > 0);
const swR = await post("/api/subwobble", { demo: true, params: { note: 28, bars: 1 } });
check("subwobble sintetiza un wobble de amplitud", swR.success && swR.data.bars === 1 && swR.data.wave.length > 0);
const vcR2 = await post("/api/vocoder", { demo: true, params: { note: 60, bars: 1 } });
check("vocoder sintetiza palabras vocales", vcR2.success && vcR2.data.bars === 1 && vcR2.data.wave.length > 0);
const nfR = await post("/api/noisefx", { demo: true, params: { type: "sweep_up", length: 1 } });
check("noisefx sintetiza un sweep", nfR.success && nfR.data.type === "sweep_up" && nfR.data.wave.length > 0);
const cyR = await post("/api/cymbal", { demo: true, params: { type: "crash" } });
const cyAudio = await fetch(base + cyR.data.audio);
check("cymbal sintetiza un crash y sirve el WAV", cyR.success && cyR.data.type === "crash" && cyR.data.wave.length > 0 && cyAudio.ok && (cyAudio.headers.get("content-type") || "").includes("audio/wav"));
// Instrument Render con los 6 nuevos motores melódicos.
const renEP = await post("/api/render", { demo: true, engine: "epiano" });
check("instrumentrender funciona con epiano", renEP.success && renEP.data.engine === "epiano" && renEP.data.noteCount === 6);
const gtR = await post("/api/guitar", { demo: true, params: { note: 40, chord: "power" } });
check("guitar sintetiza un power chord", gtR.success && gtR.data.chord === "power" && gtR.data.wave.length > 0);
const stR2 = await post("/api/sitar", { demo: true, params: { note: 60 } });
check("sitar sintetiza con buzz", stR2.success && stR2.data.note === 60 && stR2.data.wave.length > 0);
const sdR2 = await post("/api/steeldrum", { demo: true, params: { note: 64 } });
check("steeldrum sintetiza un tono de pan", sdR2.success && sdR2.data.note === 64 && sdR2.data.wave.length > 0);
const acR2 = await post("/api/accordion", { demo: true, params: { note: 60, chord: "maj" } });
check("accordion sintetiza un acorde musette", acR2.success && acR2.data.chord === "maj" && acR2.data.wave.length > 0);
const thR2 = await post("/api/theremin", { demo: true, params: { note: 67, endNote: 72 } });
check("theremin sintetiza un glide", thR2.success && thR2.data.wave.length > 0);
const hhR = await post("/api/hihat808", { demo: true, params: { open: false } });
check("hihat808 sintetiza un hat cerrado", hhR.success && hhR.data.wave.length > 0);
const shR2 = await post("/api/stabhit", { demo: true, params: { note: 60, chord: "maj" } });
check("stabhit sintetiza un stab de brass", shR2.success && shR2.data.chord === "maj" && shR2.data.wave.length > 0);
const gbR = await post("/api/glassbell", { demo: true, params: { note: 72 } });
check("glassbell sintetiza una campana de cristal", gbR.success && gbR.data.note === 72 && gbR.data.wave.length > 0);
const skR = await post("/api/subkick", { demo: true, params: { note: 24 } });
check("subkick sintetiza un sub de kick", skR.success && skR.data.note === 24 && skR.data.wave.length > 0);
const rsR = await post("/api/reversesweep", { demo: true, params: { length: 1.5 } });
const rsAudio = await fetch(base + rsR.data.audio);
check("reversesweep sintetiza un build y sirve el WAV", rsR.success && rsR.data.durSec > 1 && rsR.data.wave.length > 0 && rsAudio.ok && (rsAudio.headers.get("content-type") || "").includes("audio/wav"));
// Instrument Render con guitar.
const renGt = await post("/api/render", { demo: true, engine: "guitar" });
check("instrumentrender funciona con guitar", renGt.success && renGt.data.engine === "guitar" && renGt.data.noteCount === 6);

// Device Remote: control genérico de parámetros de cualquier device (incluido M4L simulado).
const mkDevParam = (name: string, v: number, min = 0, max = 127) => { let val = v; return { name, min, max, isQuantized: false, defaultValue: v, async getValue() { return val; }, async setValue(x: number) { val = x; } }; };
const drDev = { name: "Max Instrument (M4L)", parameters: [mkDevParam("Cutoff", 60), mkDevParam("Reso", 20), mkDevParam("Macro 1", 64)] };
const drSong: any = { tracks: [{ name: "Synth", devices: [drDev] }] };
const drList = await reg.execute("devremote__list_devices", { track_index: 0 }, drSong);
check("devremote lista devices genéricos (incl. M4L)", drList.success && drList.data.deviceCount === 1 && drList.data.devices[0].name === "Max Instrument (M4L)");
const drParams = await reg.execute("devremote__get_params", { track_index: 0, device_index: 0 }, drSong);
check("devremote lee todos los parámetros con su valor real", drParams.success && drParams.data.paramCount === 3 && drParams.data.params[0].value === 60);
const drSet = await reg.execute("devremote__set_param", { track_index: 0, device_index: 0, param_name: "Cutoff", value: 100 }, drSong);
check("devremote setea un parámetro directamente", drSet.success && drSet.data.value === 100 && (await drDev.parameters[0].getValue()) === 100);
const drReset = await reg.execute("devremote__reset_param", { track_index: 0, device_index: 0, param_name: "Cutoff" }, drSong);
check("devremote resetea a su valor por defecto", drReset.success && drReset.data.value === 60);
const drSave = await reg.execute("devremote__save_snapshot", { track_index: 0, device_index: 0, name: "Test patch" }, drSong);
check("devremote guarda un snapshot completo del device", drSave.success && drSave.data.paramCount === 3);
await drDev.parameters[2].setValue(10); // mutate Macro 1 away from its snapshot value
const drLoad = await reg.execute("devremote__load_snapshot", { id: drSave.data.id }, drSong);
check("devremote restaura el snapshot completo", drLoad.success && drLoad.data.restored === 3 && (await drDev.parameters[2].getValue()) === 64);
const drDel = await reg.execute("devremote__delete_snapshot", { id: drSave.data.id }, drSong);
check("devremote borra el snapshot", drDel.success && drDel.data.deleted === true);
const drSweep = await reg.execute("devremote__sweep_param", { track_index: 0, device_index: 0, param_name: "Cutoff", from: 0, to: 120, duration_ms: 80, steps: 4 }, drSong);
check("devremote sweep_param mueve el parámetro en tiempo real (undoable)", drSweep.success && drSweep.data.finalValue === 120 && (await drDev.parameters[0].getValue()) === 120);
const drUndoSweep = await reg.execute("history__undo_target", { scope: "device", track_index: 0, device_index: 0 }, drSong);
check("devremote sweep_param es deshacible", drUndoSweep.success && (await drDev.parameters[0].getValue()) === 60);
const drSaveA = await reg.execute("devremote__save_snapshot", { track_index: 0, device_index: 0, name: "A" }, drSong);
await drDev.parameters[0].setValue(30);
const drSaveB = await reg.execute("devremote__save_snapshot", { track_index: 0, device_index: 0, name: "B" }, drSong);
const drCmp = await reg.execute("devremote__compare_snapshots", { id_a: drSaveA.data.id, id_b: drSaveB.data.id }, drSong);
check("devremote compare_snapshots detecta el cambio real de Cutoff", drCmp.success && drCmp.data.diffs.some((d: any) => d.param === "Cutoff" && d.a === 60 && d.b === 30));
await reg.execute("devremote__delete_snapshot", { id: drSaveA.data.id }, drSong);
await reg.execute("devremote__delete_snapshot", { id: drSaveB.data.id }, drSong);

// API Console: execute_command muta el Set de verdad + save/list/run persistentes.
const ccSong: any = { tempo: 120, tracks: [] as any[] }; ccSong.createMidiTrack = async () => { const t: any = { _n: "", get name() { return this._n; }, set name(v: any) { this._n = v; } }; ccSong.tracks.push(t); return t; };
const ccCmd = await reg.execute("console__execute_command", { command: "tempo 128" }, ccSong);
check("console.execute_command setea el tempo real", ccCmd.success && ccSong.tempo === 128 && ccCmd.data.tempo === 128);
const ccCreate = await reg.execute("console__execute_command", { command: "create midi" }, ccSong);
check("console.execute_command crea un track real", ccCreate.success && ccSong.tracks.length === 1 && ccCreate.data.created === "midi");
const ccName = `Smoke ${Date.now()}`;
const ccSave = await reg.execute("console__save_script", { name: ccName, script: "return 1+1;" }, ccSong);
const ccList = await reg.execute("console__list_saved_scripts", {}, ccSong);
check("console.save/list persisten el script", ccSave.success && ccList.success && ccList.data.scripts.some((s: any) => s.id === ccSave.data.id && s.name === ccName));
const ccRun = await reg.execute("console__run_saved_script", { id: ccSave.data.id }, ccSong);
check("console.run_saved_script ejecuta el guardado", ccRun.success && ccRun.data.result === 2);
const ccDel = await reg.execute("console__delete_saved_script", { id: ccSave.data.id }, ccSong);
check("console.delete_saved_script borra el guardado", ccDel.success && ccDel.data.deleted === true);

// 7p. Edit History — global undo backing every destructive edit.
await reg.execute("history__clear", {}, song);
const ehSong: any = { tracks: [{ name: "H", clipSlots: [{ clip: { name: "c", color: 0, get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: [{ pitch: 60, startTime: 0, duration: 1, velocity: 100 }] } }], arrangementClips: [] }] };
const ehT = await reg.execute("transposer__apply", { track_index: 0, clip_index: 0, semitones: 5 }, ehSong);
check("history: la edición deja el clip transpuesto", ehT.success && ehSong.tracks[0].clipSlots[0].clip.notes[0].pitch === 65);
const ehL = await reg.execute("history__list", {}, ehSong);
check("history: registra la edición destructiva", ehL.success && ehL.data.total >= 1 && ehL.data.entries[0].label === "transposer.apply");
const ehU = await reg.execute("history__undo_last", {}, ehSong);
check("history: undo_last restaura el estado previo", ehU.success && ehSong.tracks[0].clipSlots[0].clip.notes[0].pitch === 60);
const ehR = await reg.execute("history__redo_last", {}, ehSong);
check("history: redo_last re-aplica la transposición de verdad (no es 'undo del undo')", ehR.success && ehSong.tracks[0].clipSlots[0].clip.notes[0].pitch === 65);
const ehColor: any = { tracks: [{ name: "T", clipSlots: [{ clip: { name: "k", color: 7, get notes() { return []; } } }], arrangementClips: [] }] };
await reg.execute("phrasefinder__highlight_match", { track_index: 0, clip_index: 0, color: 16 }, ehColor);
const ehC = await reg.execute("history__undo_target", { scope: "clip", track_index: 0, clip_index: 0 }, ehColor);
check("history: undo_target revierte el color del clip", ehC.success && ehColor.tracks[0].clipSlots[0].clip.color === 7);
const ehCR = await reg.execute("history__redo_target", { scope: "clip", track_index: 0, clip_index: 0 }, ehColor);
check("history: redo_target re-aplica el color deshecho", ehCR.success && ehColor.tracks[0].clipSlots[0].clip.color === 16);

// 8. estáticos
const html = await (await fetch(base + "/")).text();
check("sirve index.html (shell)", html.includes("Live Studio") && html.includes("shell.js"));
const js = await fetch(base + "/shell.js");
check("sirve shell.js con mime correcto", (js.headers.get("content-type") || "").includes("javascript"));

// 9. regresión: los generadores deben escribir TODAS las notas en un único `clip.notes`.
// El MidiClip real reemplaza la lista y su setter no se refleja en un getter inmediato;
// escribir nota a nota dejaba solo la última (el bug "una sola nota" del tester). Este
// clip mock modela ese setter (commit diferido) para que el patrón read-modify-write falle.
function asyncClip(): any {
  let committed: any[] = [];
  return {
    name: "", duration: 16,
    get notes() { return committed.slice(); },
    set notes(n: any[]) { const v = n.slice(); queueMicrotask(() => { committed = v; }); },
  };
}
const rClip = asyncClip();
const miniSong: any = { tracks: [], async createMidiTrack() { const t = { name: "", async createMidiClip() { return rClip; } }; miniSong.tracks.push(t); return t; } };
const cg = await reg.execute("chords__generate_chords", { key: "C", scale: "major", genre: "pop" }, miniSong);
await new Promise((r) => setTimeout(r, 0)); // deja que el setter diferido haga commit
check("chords escribe el acorde completo, no una sola nota", cg.success && rClip.notes.length === 12);
check("chords genera acordes distintos (no la tónica repetida)", new Set(rClip.notes.map((n: any) => n.pitch)).size > 3);

console.log(`\n=== Resultado: ${pass} OK, ${fail} fallos ===`);
await server.close();
process.exit(fail ? 1 : 0);
