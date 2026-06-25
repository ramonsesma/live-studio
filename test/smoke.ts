// Smoke test: levanta el servidor con un `song` simulado y verifica endpoints + tools.
import { createMasterRegistry } from "../src/registry/index.js";
import { Bridge } from "../src/bridge.js";
import { startServer } from "../src/server.js";
import { toMusicXML, fromMusicXML } from "../src/core/musicxml.js";

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
check("GET /api/modules devuelve 82 módulos", (mods.modules || []).length === 82, JSON.stringify(mods.modules?.map((m: any) => m.id)));
check("quickactions marcado como hidden", mods.modules.find((m: any) => m.id === "quickactions")?.hidden === true);
check("81 módulos visibles (sin hidden)", mods.modules.filter((m: any) => !m.hidden).length === 81);

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
const allPanels = ["organizer", "fxchain", "mixconsole", "stepseq", "chordpads", "drums", "drummap", "clipgraph", "notation", "takes", "eq", "midilfo", "midigate", "synth", "genarranger", "trackmanager", "health", "mastering", "rackbuilder", "performance", "clipversions", "resonance", "autogain", "keyscale", "genrhythm", "texturemap", "spectrumcompare", "projectsnapshot", "scoreeditor", "clipvariations", "stemalign", "samplebrain", "macromorph", "loopdetect", "warpcompare", "paramdiff", "phrasefinder", "saferandom", "groovetemplate", "probabilitylab", "velocompress", "transposer", "colortheory", "takeorganizer", "audio2midi", "history"];
for (const p of allPanels) {
  const res = await fetch(base + "/panels/" + p + ".js");
  if (!res.ok || !(res.headers.get("content-type") || "").includes("javascript")) panelsOk = false;
}
check("sirve los 46 paneles ricos", panelsOk);

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

// 7d. Auto-Gain Stager: demo mode proves the render→measure→plan pipeline + fader math.
const ag = await post("/api/autogain", { demo: true, targetMode: "average" });
check("autogain /api/autogain demo → plan de faders", ag.success && ag.data.tracks.length === 6 && ag.data.tracks.every((t: any) => typeof t.faderDb === "number" && typeof t.faderValue === "number"));
const agQuiet = ag.data.tracks.find((t: any) => t.name === "Synth"); // quietest stem must get a positive (boost) move toward the average
check("autogain sube las pistas por debajo de la referencia", agQuiet.faderDb > 0);

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
check("genrhythm add_fill inserta un redoble", grAf.success && grAf.data.fillNotes > 0 && grClip.notes.length !== grBefore);
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
await post("/api/snapshot", { action: "delete", id: sv1.data.id });
await post("/api/snapshot", { action: "delete", id: sv2.data.id });

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

// 7p. Edit History — global undo backing every destructive edit.
await reg.execute("history__clear", {}, song);
const ehSong: any = { tracks: [{ name: "H", clipSlots: [{ clip: { name: "c", color: 0, get notes() { return (this as any)._n; }, set notes(v: any) { (this as any)._n = v; }, _n: [{ pitch: 60, startTime: 0, duration: 1, velocity: 100 }] } }], arrangementClips: [] }] };
const ehT = await reg.execute("transposer__apply", { track_index: 0, clip_index: 0, semitones: 5 }, ehSong);
check("history: la edición deja el clip transpuesto", ehT.success && ehSong.tracks[0].clipSlots[0].clip.notes[0].pitch === 65);
const ehL = await reg.execute("history__list", {}, ehSong);
check("history: registra la edición destructiva", ehL.success && ehL.data.total >= 1 && ehL.data.entries[0].label === "transposer.apply");
const ehU = await reg.execute("history__undo_last", {}, ehSong);
check("history: undo_last restaura el estado previo", ehU.success && ehSong.tracks[0].clipSlots[0].clip.notes[0].pitch === 60);
const ehColor: any = { tracks: [{ name: "T", clipSlots: [{ clip: { name: "k", color: 7, get notes() { return []; } } }], arrangementClips: [] }] };
await reg.execute("phrasefinder__highlight_match", { track_index: 0, clip_index: 0, color: 16 }, ehColor);
const ehC = await reg.execute("history__undo_target", { scope: "clip", track_index: 0, clip_index: 0 }, ehColor);
check("history: undo_target revierte el color del clip", ehC.success && ehColor.tracks[0].clipSlots[0].clip.color === 7);

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
