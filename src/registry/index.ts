// Punto único de ensamblaje: añadir un módulo nuevo = una línea aquí.
import { MasterRegistry } from "../core/registry.js";
import { createToolRegistry as sessionTools } from "../modules/session/tools.js";
import { createToolRegistry as chordsTools } from "../modules/chords/tools.js";
import { createToolRegistry as drumsTools } from "../modules/drums/tools.js";
import { createToolRegistry as eqTools } from "../modules/eq/tools.js";
import { createToolRegistry as sidechainTools } from "../modules/sidechain/tools.js";
import { createToolRegistry as stereoTools } from "../modules/stereo/tools.js";
import { createToolRegistry as samplerTools } from "../modules/sampler/tools.js";
import { createToolRegistry as arrangementTools } from "../modules/arrangement/tools.js";
import { createToolRegistry as vocalTools } from "../modules/vocal/tools.js";
import { createToolRegistry as sfxTools } from "../modules/sfx/tools.js";
import { createToolRegistry as performanceTools } from "../modules/performance/tools.js";
import { createToolRegistry as clipsTools } from "../modules/clips/tools.js";
import { createToolRegistry as harmonicTools } from "../modules/harmonic/tools.js";
import { createToolRegistry as takesTools } from "../modules/takes/tools.js";
import { createToolRegistry as colorizerTools } from "../modules/colorizer/tools.js";
import { createToolRegistry as melodyTools } from "../modules/melody/tools.js";
import { createToolRegistry as masteringTools } from "../modules/mastering/tools.js";
import { createToolRegistry as synthTools } from "../modules/synth/tools.js";
import { createToolRegistry as templatesTools } from "../modules/templates/tools.js";
import { createToolRegistry as notesTools } from "../modules/notes/tools.js";
import { createToolRegistry as grooveTools } from "../modules/groove/tools.js";
import { createToolRegistry as automationTools } from "../modules/automation/tools.js";
import { createToolRegistry as organizerTools } from "../modules/organizer/tools.js";
import { createToolRegistry as quickActionsTools } from "../modules/quickactions/tools.js";
import { createToolRegistry as compressorTools } from "../modules/compressor/tools.js";
import { createToolRegistry as mixAssistantTools } from "../modules/mixassistant/tools.js";
import { createToolRegistry as genreTools } from "../modules/genre/tools.js";
import { createToolRegistry as eqMatchTools } from "../modules/eqmatch/tools.js";
import { createToolRegistry as harmonizerTools } from "../modules/harmonizer/tools.js";
import { createToolRegistry as quantizerTools } from "../modules/quantizer/tools.js";
import { createToolRegistry as delayCalcTools } from "../modules/delaycalc/tools.js";
import { createToolRegistry as randomizerTools } from "../modules/randomizer/tools.js";
import { createToolRegistry as stemsTools } from "../modules/stems/tools.js";
import { createToolRegistry as sectionsTools } from "../modules/sections/tools.js";
import { createToolRegistry as lyricMelodyTools } from "../modules/lyricmelody/tools.js";
import { createToolRegistry as fxPresetsTools } from "../modules/fxpresets/tools.js";
import { createToolRegistry as pluginsTools } from "../modules/plugins/tools.js";
import { createToolRegistry as timeSigTools } from "../modules/timesig/tools.js";
import { createToolRegistry as crossfadeTools } from "../modules/crossfade/tools.js";
import { createToolRegistry as presetsTools } from "../modules/presets/tools.js";
import { createToolRegistry as microtonalTools } from "../modules/microtonal/tools.js";
import { createToolRegistry as chordPadsTools } from "../modules/chordpads/tools.js";
import { createToolRegistry as snapshotsTools } from "../modules/snapshots/tools.js";
import { createToolRegistry as healthTools } from "../modules/health/tools.js";
import { createToolRegistry as controllerTools } from "../modules/controller/tools.js";
import { createToolRegistry as notationTools } from "../modules/notation/tools.js";
import { createToolRegistry as drumReplaceTools } from "../modules/drumreplace/tools.js";
import { createToolRegistry as audio2midiTools } from "../modules/audio2midi/tools.js";
import { createToolRegistry as genArrangerTools } from "../modules/genarranger/tools.js";
import { createToolRegistry as setlistTools } from "../modules/setlist/tools.js";
import { createToolRegistry as mediaPoolTools } from "../modules/mediapool/tools.js";
import { createToolRegistry as groupRoutingTools } from "../modules/grouprouting/tools.js";
import { createToolRegistry as trackManagerTools } from "../modules/trackmanager/tools.js";
import { createToolRegistry as tempoSyncTools } from "../modules/temposync/tools.js";
import { createToolRegistry as mixSceneTools } from "../modules/mixscene/tools.js";
import { createToolRegistry as consoleTools } from "../modules/console/tools.js";
import { createToolRegistry as fileManagerTools } from "../modules/filemanager/tools.js";
import { createToolRegistry as clipVersionsTools } from "../modules/clipversions/tools.js";
import { createToolRegistry as looperControlTools } from "../modules/loopercontrol/tools.js";
import { createToolRegistry as drumMapTools } from "../modules/drummap/tools.js";
import { createToolRegistry as midiGateTools } from "../modules/midigate/tools.js";
import { createToolRegistry as restorerTools } from "../modules/restorer/tools.js";
import { createToolRegistry as macrosTools } from "../modules/macros/tools.js";
import { createToolRegistry as stepSeqTools } from "../modules/stepseq/tools.js";
import { createToolRegistry as drumBusTools } from "../modules/drumbus/tools.js";
import { createToolRegistry as rackCyclerTools } from "../modules/rackcycler/tools.js";
import { createToolRegistry as vocalCompTools } from "../modules/vocalcomp/tools.js";
import { createToolRegistry as maxDevicesTools } from "../modules/maxdevices/tools.js";
import { createToolRegistry as recRouterTools } from "../modules/recrouter/tools.js";
import { createToolRegistry as headphoneTools } from "../modules/headphone/tools.js";
import { createToolRegistry as arrLooperTools } from "../modules/arrlooper/tools.js";
import { createToolRegistry as modMatrixTools } from "../modules/modmatrix/tools.js";
import { createToolRegistry as phaseAlignTools } from "../modules/phasealign/tools.js";
import { createToolRegistry as spectrogramTools } from "../modules/spectrogram/tools.js";
import { createToolRegistry as mixConsoleTools } from "../modules/mixconsole/tools.js";
import { createToolRegistry as trackColorTools } from "../modules/trackcolor/tools.js";
import { createToolRegistry as exportBatchTools } from "../modules/exportbatch/tools.js";
import { createToolRegistry as rackBuilderTools } from "../modules/rackbuilder/tools.js";
import { createToolRegistry as audioCompareTools } from "../modules/audiocompare/tools.js";
import { createToolRegistry as vocalTunerTools } from "../modules/vocaltuner/tools.js";
import { createToolRegistry as midiTransformTools } from "../modules/miditransform/tools.js";
import { createToolRegistry as sidechainProTools } from "../modules/sidechainpro/tools.js";
import { createToolRegistry as midiLfoTools } from "../modules/midilfo/tools.js";
import { createToolRegistry as freqSplitTools } from "../modules/freqsplit/tools.js";
import { createToolRegistry as launchQuantTools } from "../modules/launchquant/tools.js";
import { createToolRegistry as sandboxTools } from "../modules/sandbox/tools.js";
import { createToolRegistry as fingerprintTools } from "../modules/fingerprint/tools.js";
import { createToolRegistry as clipGraphTools } from "../modules/clipgraph/tools.js";
import { createToolRegistry as tempoTapTools } from "../modules/tempotap/tools.js";
import { createToolRegistry as patchesTools } from "../modules/patches/tools.js";
import { createToolRegistry as midiMapTools } from "../modules/midimap/tools.js";
import { createToolRegistry as cueMixerTools } from "../modules/cuemixer/tools.js";
import { createToolRegistry as audioQuantTools } from "../modules/audioquant/tools.js";
import { createToolRegistry as midiMonTools } from "../modules/midimon/tools.js";
import { createToolRegistry as fxChainTools } from "../modules/fxchain/tools.js";

export function createMasterRegistry(): MasterRegistry {
  const m = new MasterRegistry();

  // --- Lote 1 (núcleo) ---
  m.addModule({ id:"session", label:"Sesión & Pistas", icon:"🗂️", description:"Control base: tempo, pistas, solo/mute/arm.", registry: sessionTools() });
  m.addModule({ id:"chords",  label:"Acordes & Progresiones", icon:"🎹", description:"Genera progresiones por género y tonalidad.", registry: chordsTools() });
  m.addModule({ id:"drums",   label:"Drums & Patrones", icon:"🥁", description:"Patrones de batería por género con variaciones.", registry: drumsTools() });
  m.addModule({ id:"eq",      label:"EQ & Análisis", icon:"🎚️", description:"Análisis de frecuencias, presets de EQ y sidechain.", registry: eqTools() });

  // --- Lote 2 (mezcla / sonido / arreglo) ---
  m.addModule({ id:"sidechain",   label:"Sidechain", icon:"🔗", description:"Rutas de sidechain, detección de problemas y configuración.", registry: sidechainTools() });
  m.addModule({ id:"stereo",      label:"Stereo & Imaging", icon:"🎧", description:"Análisis de campo estéreo, anchura, mid/side y auto-pan.", registry: stereoTools() });
  m.addModule({ id:"sampler",     label:"Sampler & Slicing", icon:"✂️", description:"Analiza, trocea audio a MIDI y ajusta parámetros de slice.", registry: samplerTools() });
  m.addModule({ id:"arrangement", label:"Arreglo & Navegación", icon:"🎬", description:"Marcadores, posición del playhead y navegación por compases.", registry: arrangementTools() });
  m.addModule({ id:"vocal",       label:"Vocal Chain & FX", icon:"🎤", description:"Cadena vocal completa: EQ, de-esser, compresor y FX creativos.", registry: vocalTools() });
  m.addModule({ id:"sfx",         label:"SFX & Texturas", icon:"🌫️", description:"Genera efectos de sonido y texturas ambientales por categoría.", registry: sfxTools() });

  // --- Lote 3 (performance / composición / organización) ---
  m.addModule({ id:"melody",      label:"Generador de Melodías", icon:"🎼", description:"Melodías por escala y tonalidad con articulaciones.", registry: melodyTools() });
  m.addModule({ id:"performance", label:"Performance & Looper", icon:"🔴", description:"Grabación en loop, mute en vivo, escenas y fills.", registry: performanceTools() });
  m.addModule({ id:"clips",       label:"Clips & Escenas", icon:"🎛️", description:"Organiza clips por mood, grupos de lanzamiento y escenas.", registry: clipsTools() });
  m.addModule({ id:"harmonic",    label:"DJ & Mezcla Armónica", icon:"🎶", description:"Rueda Camelot, pistas compatibles y transiciones.", registry: harmonicTools() });
  m.addModule({ id:"takes",       label:"Takes & Comping", icon:"🎙️", description:"Grabación multi-take, selección y comping automático.", registry: takesTools() });
  m.addModule({ id:"colorizer",   label:"Clip Colorizer", icon:"🎨", description:"Colorea clips por velocity, pitch o duración.", registry: colorizerTools() });

  // --- Lote 4 (mezcla / síntesis / organización avanzada) ---
  m.addModule({ id:"mastering",   label:"Gain Staging & Niveles", icon:"📊", description:"Analiza el gain staging, headroom y empareja niveles.", registry: masteringTools() });
  m.addModule({ id:"synth",       label:"Synth Patchbay", icon:"🔌", description:"Patchbay modular: añade módulos, conecta puertos y guarda patches.", registry: synthTools() });
  m.addModule({ id:"templates",   label:"Plantillas de Proyecto", icon:"📐", description:"Extrae, lista y aplica plantillas a partir de tu proyecto.", registry: templatesTools() });
  m.addModule({ id:"notes",       label:"Notas de Proyecto", icon:"📝", description:"Notas categorizadas con búsqueda, tags y exportación.", registry: notesTools() });
  m.addModule({ id:"groove",      label:"Groove & Humanize", icon:"🌀", description:"Extrae y aplica groove de timing/velocity a clips MIDI.", registry: grooveTools() });
  m.addModule({ id:"automation",  label:"Automatización & Curvas", icon:"📈", description:"Lanes de automatización: suaviza, transforma y lee envolventes.", registry: automationTools() });

  // --- Módulos estrella (panel rico) ---
  m.addModule({ id:"organizer",   label:"Organizador de Sesión", icon:"🧩", description:"Score de organización, auto-organizar, agrupar escenas, naming, análisis y plantillas por género.", registry: organizerTools() });
  m.addModule({ id:"fxchain",     label:"Cadenas de Efectos", icon:"⛓️", description:"Cadenas de efectos preconstruidas por género: aplica, personaliza y analiza pistas.", registry: fxChainTools() });

  // --- Lote 6 (mezcla / análisis / MIDI / arreglo) ---
  m.addModule({ id:"compressor",  label:"Compresión & Dinámica", icon:"🗜️", description:"Análisis de rango dinámico, presets de compresión y multibanda.", registry: compressorTools() });
  m.addModule({ id:"mixassistant",label:"Mixing Assistant IA", icon:"🎚️", description:"Analiza la mezcla, sugiere EQ/compresión y objetivos de loudness.", registry: mixAssistantTools() });
  m.addModule({ id:"genre",       label:"Clasificador de Género", icon:"🏷️", description:"Clasifica pistas por género y da recomendaciones.", registry: genreTools() });
  m.addModule({ id:"eqmatch",     label:"EQ Match", icon:"📊", description:"Analiza espectro, captura referencias y empareja EQ.", registry: eqMatchTools() });
  m.addModule({ id:"harmonizer",  label:"MIDI Harmonizer", icon:"🎵", description:"Voces de armonía, voice leading y clips de acordes por grados.", registry: harmonizerTools() });
  m.addModule({ id:"quantizer",   label:"Quantize & Swing", icon:"📐", description:"Cuantiza con fuerza y swing, presets de groove por género.", registry: quantizerTools() });
  m.addModule({ id:"delaycalc",   label:"Delay Calculator", icon:"⏱️", description:"Tiempos de delay/reverb desde el BPM y tap tempo.", registry: delayCalcTools() });
  m.addModule({ id:"randomizer",  label:"MIDI Randomizer", icon:"🎲", description:"Aleatoriza pitch, velocity, timing y duración con restricciones.", registry: randomizerTools() });
  m.addModule({ id:"stems",       label:"Stem Splitter", icon:"🪓", description:"Separa audio en stems (voz, drums, bajo, otros) y ajusta aislamiento.", registry: stemsTools() });
  m.addModule({ id:"sections",    label:"Secciones de Arreglo", icon:"🧱", description:"Detecta, crea, mueve y exporta secciones del arreglo.", registry: sectionsTools() });

  // --- Lote 7 (composición / FX / gestión / tuning) ---
  m.addModule({ id:"lyricmelody", label:"Letra → Melodía", icon:"✍️", description:"Analiza letras (sílabas/acentos) y genera melodía + armonía.", registry: lyricMelodyTools() });
  m.addModule({ id:"fxpresets",   label:"FX Chain Presets", icon:"🎛️", description:"Guarda, busca, aplica y compara cadenas de efectos.", registry: fxPresetsTools() });
  m.addModule({ id:"plugins",     label:"Plugin Browser", icon:"🔌", description:"Escanea VST3/AU, busca, añade a pista y gestiona favoritos.", registry: pluginsTools() });
  m.addModule({ id:"timesig",     label:"Time Signature", icon:"🕐", description:"Compases, cambios de métrica, mapa y polirritmos.", registry: timeSigTools() });
  m.addModule({ id:"crossfade",   label:"Crossfade Tool", icon:"🔀", description:"Detecta solapes y aplica crossfades con curvas.", registry: crossfadeTools() });
  m.addModule({ id:"presets",     label:"Device Presets", icon:"🎚️", description:"Navega presets de dispositivos, previsualiza y carga.", registry: presetsTools() });
  m.addModule({ id:"microtonal",  label:"Microtonal Tuner", icon:"🪕", description:"Escalas microtonales, afinación por cents e import SCL.", registry: microtonalTools() });
  m.addModule({ id:"chordpads",   label:"Chord Pads", icon:"🎹", description:"Asigna acordes a pads, dispara y configura layout.", registry: chordPadsTools() });
  m.addModule({ id:"snapshots",   label:"Snapshots", icon:"📸", description:"Guarda, carga y gestiona estados del set.", registry: snapshotsTools() });
  m.addModule({ id:"health",      label:"Project Health", icon:"🩺", description:"Chequeos de salud del proyecto: pistas muertas, plugins, CPU.", registry: healthTools() });

  // --- Lote 8 (hardware / conversión / live / routing) ---
  m.addModule({ id:"controller",  label:"Controller Mapper", icon:"🎛️", description:"Detecta controladores MIDI y mapea elementos a parámetros.", registry: controllerTools() });
  m.addModule({ id:"notation",    label:"Notation Viewer", icon:"🎼", description:"Notas como partitura, score estructurado, export PDF y transposición.", registry: notationTools() });
  m.addModule({ id:"drumreplace", label:"Drum Replacer", icon:"🥁", description:"Analiza golpes y reemplaza/capa drums con kits.", registry: drumReplaceTools() });
  m.addModule({ id:"audio2midi",  label:"Audio → MIDI", icon:"🎤", description:"Convierte audio a MIDI: melodía, acordes o drums.", registry: audio2midiTools() });
  m.addModule({ id:"genarranger", label:"Generative Arranger", icon:"🌀", description:"Genera arreglos completos con curva de energía y variaciones.", registry: genArrangerTools() });
  m.addModule({ id:"setlist",     label:"Setlist Manager", icon:"📋", description:"Crea setlists para directo, añade canciones, reordena y exporta.", registry: setlistTools() });
  m.addModule({ id:"mediapool",   label:"Media Pool", icon:"🗃️", description:"Biblioteca de samples: lista, importa, previsualiza y organiza.", registry: mediaPoolTools() });
  m.addModule({ id:"grouprouting",label:"Group Routing", icon:"🔗", description:"Crea grupos, añade pistas y configura su routing.", registry: groupRoutingTools() });
  m.addModule({ id:"trackmanager",label:"Bulk Track Manager", icon:"🗂️", description:"Acciones masivas: mute/solo/arm/color/volumen/duplicar.", registry: trackManagerTools() });
  m.addModule({ id:"temposync",   label:"Tempo & Grid Sync", icon:"🕐", description:"Tempo, time sig, sincroniza pistas, detecta BPM y warp.", registry: tempoSyncTools() });

  // --- Lote 9 (mezcla / utilidades / secuenciación / restauración) ---
  m.addModule({ id:"mixscene",    label:"Mix Scene Saver", icon:"🎚️", description:"Guarda, recupera y compara estados del mixer.", registry: mixSceneTools() });
  m.addModule({ id:"console",     label:"API Console", icon:"⌨️", description:"Ejecuta comandos de la Live API, scripts y explora la API.", registry: consoleTools() });
  m.addModule({ id:"filemanager", label:"File Manager", icon:"📁", description:"Archivos del proyecto: recopila, limpia, busca faltantes y stats.", registry: fileManagerTools() });
  m.addModule({ id:"clipversions",label:"Clip Versions", icon:"🕰️", description:"Historial de versiones de clips: guarda, restaura y diff.", registry: clipVersionsTools() });
  m.addModule({ id:"loopercontrol",label:"Looper Controller", icon:"🔁", description:"Loop recording, overdub, multiply y control de capas.", registry: looperControlTools() });
  m.addModule({ id:"drummap",     label:"Drum Map Editor", icon:"🥁", description:"Mapea pads a notas MIDI, routing y presets de drum map.", registry: drumMapTools() });
  m.addModule({ id:"midigate",    label:"MIDI Gate", icon:"🚪", description:"Gate MIDI sobre audio, patrones de gate y render.", registry: midiGateTools() });
  m.addModule({ id:"restorer",    label:"Audio Restorer", icon:"🩹", description:"Reduce ruido, quita clicks, de-ess y de-clip.", registry: restorerTools() });
  m.addModule({ id:"macros",      label:"Macro Mapper Pro", icon:"🎛️", description:"Mapeos de macros con curvas, presets y batch.", registry: macrosTools() });
  m.addModule({ id:"stepseq",     label:"Step Sequencer", icon:"🔢", description:"Secuenciador por pasos: patrones, parámetros y cadenas.", registry: stepSeqTools() });

  // --- Lote 10 (mezcla avanzada / synth / live / análisis) ---
  m.addModule({ id:"drumbus",     label:"Drum Bus Processor", icon:"🥁", description:"Compresión de bus, paralela, transient shaper y análisis.", registry: drumBusTools() });
  m.addModule({ id:"rackcycler",  label:"Rack Preset Cycler", icon:"🔄", description:"Cicla cadenas de un rack: next/prev, jump y auto-cycle.", registry: rackCyclerTools() });
  m.addModule({ id:"vocalcomp",   label:"Vocal Comp Editor", icon:"🎙️", description:"Comping vocal: rate takes, swipe, crossfade y flatten.", registry: vocalCompTools() });
  m.addModule({ id:"maxdevices",  label:"Max Device Manager", icon:"🟢", description:"Gestiona dispositivos Max for Live: freeze, params y presets.", registry: maxDevicesTools() });
  m.addModule({ id:"recrouter",   label:"Recording Router", icon:"⏺️", description:"Crea pistas de grabación, routing de entrada, punch y rec.", registry: recRouterTools() });
  m.addModule({ id:"headphone",   label:"Cue / Headphone Mixer", icon:"🎧", description:"Mezcla de cue: niveles, bus, solo-in-cue y presets.", registry: headphoneTools() });
  m.addModule({ id:"arrlooper",   label:"Arrangement Looper", icon:"🔁", description:"Regiones de loop en arrangement con transiciones y rec.", registry: arrLooperTools() });
  m.addModule({ id:"modmatrix",   label:"Modulation Matrix", icon:"🕸️", description:"Matriz de modulación: añade, ajusta y togglea routings.", registry: modMatrixTools() });
  m.addModule({ id:"phasealign",  label:"Phase Aligner", icon:"〰️", description:"Analiza y alinea fase entre pistas, tolerancia y reporte.", registry: phaseAlignTools() });
  m.addModule({ id:"spectrogram", label:"Spectrogram", icon:"📈", description:"Espectro en tiempo real, waterfall, picos y peak-hold.", registry: spectrogramTools() });

  // --- Lote 11 (mezcla / MIDI / FX / export) ---
  m.addModule({ id:"mixconsole",  label:"Mix Console View", icon:"🎛️", description:"Mixer completo: faders, pan, sends, mute/solo y VU.", registry: mixConsoleTools() });
  m.addModule({ id:"trackcolor",  label:"Track Color Coordinator", icon:"🌈", description:"Esquemas de color para pistas y export del mapa.", registry: trackColorTools() });
  m.addModule({ id:"exportbatch", label:"Export Batch Processor", icon:"📤", description:"Exporta stems en lote, master y configuración por defecto.", registry: exportBatchTools() });
  m.addModule({ id:"rackbuilder", label:"Rack Builder", icon:"🧰", description:"Crea racks, añade cadenas con zonas y configura macros.", registry: rackBuilderTools() });
  m.addModule({ id:"audiocompare",label:"Audio Comparer A/B", icon:"🆚", description:"Compara A/B: diferencias espectrales, sync y reporte.", registry: audioCompareTools() });
  m.addModule({ id:"vocaltuner",  label:"Vocal Tuner", icon:"🎤", description:"Análisis de pitch, corrección, tuning y detección de escala.", registry: vocalTunerTools() });
  m.addModule({ id:"miditransform",label:"MIDI Transformer", icon:"🔧", description:"Transpone, cuantiza, humaniza, invierte y arpegia MIDI.", registry: midiTransformTools() });
  m.addModule({ id:"sidechainpro",label:"Sidechain Designer Pro", icon:"🔗", description:"Diseña sidechains con curvas, trigger, release y export.", registry: sidechainProTools() });
  m.addModule({ id:"midilfo",     label:"MIDI LFO", icon:"〰️", description:"LFO MIDI: target, forma de onda, bipolar y multi-target.", registry: midiLfoTools() });
  m.addModule({ id:"freqsplit",   label:"Frequency Splitter", icon:"🎚️", description:"Divide en bandas, procesa por banda, gain y solo.", registry: freqSplitTools() });

  // --- Lote 12 (live / utilidades / análisis / MIDI) ---
  m.addModule({ id:"launchquant", label:"Clip Launch Quantizer", icon:"⏯️", description:"Cuantización de lanzamiento global, por clip y por escena.", registry: launchQuantTools() });
  m.addModule({ id:"sandbox",     label:"Live Coding Sandbox", icon:"💻", description:"Evalúa TypeScript contra el set, autocompletado y scripts.", registry: sandboxTools() });
  m.addModule({ id:"fingerprint", label:"Audio Fingerprint ID", icon:"🔍", description:"Huella de audio, match en librería, identifica y busca similares.", registry: fingerprintTools() });
  m.addModule({ id:"clipgraph",   label:"Clip Relation Graph", icon:"🕸️", description:"Grafo de relaciones entre clips, patrones y sugerencias.", registry: clipGraphTools() });
  m.addModule({ id:"tempotap",    label:"Tempo Tapper", icon:"👆", description:"Tap tempo, set desde taps, auto-detect e historial.", registry: tempoTapTools() });
  m.addModule({ id:"patches",     label:"Patch Browser", icon:"🎹", description:"Navega, carga, previsualiza, guarda y puntúa patches.", registry: patchesTools() });
  m.addModule({ id:"midimap",     label:"MIDI Map Visualizer", icon:"🗺️", description:"Muestra el mapa MIDI, exporta/importa y filtra por device.", registry: midiMapTools() });
  m.addModule({ id:"cuemixer",    label:"Cue Mixer", icon:"🎧", description:"Mezcla de cue: niveles, master, sends y pre-fader listen.", registry: cueMixerTools() });
  m.addModule({ id:"audioquant",  label:"Audio Quantizer", icon:"🎯", description:"Analiza timing, cuantiza audio, warp mode y auto-warp.", registry: audioQuantTools() });
  m.addModule({ id:"midimon",     label:"MIDI Monitor", icon:"📟", description:"Monitoriza MIDI entrante, log, filtros y estadísticas.", registry: midiMonTools() });

  // --- Backend de la paleta de comandos rápidos (oculto: su UX es Cmd/Ctrl+K) ---
  m.addModule({ id:"quickactions", label:"Comandos Rápidos", icon:"⌘", description:"Vocabulario de 1293 micro-acciones (de las 215 extensiones *-action).", hidden:true, registry: quickActionsTools() });

  return m;
}
