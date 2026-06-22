// Single assembly point: adding a new module = one line here.
import { MasterRegistry } from "../core/registry.js";
import { createToolRegistry as sessionTools } from "../modules/session/tools.js";
import { createToolRegistry as chordsTools } from "../modules/chords/tools.js";
import { createToolRegistry as drumsTools } from "../modules/drums/tools.js";
import { createToolRegistry as eqTools } from "../modules/eq/tools.js";
import { createToolRegistry as arrangementTools } from "../modules/arrangement/tools.js";
import { createToolRegistry as vocalTools } from "../modules/vocal/tools.js";
import { createToolRegistry as sfxTools } from "../modules/sfx/tools.js";
import { createToolRegistry as performanceTools } from "../modules/performance/tools.js";
import { createToolRegistry as clipsTools } from "../modules/clips/tools.js";
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
import { createToolRegistry as harmonizerTools } from "../modules/harmonizer/tools.js";
import { createToolRegistry as quantizerTools } from "../modules/quantizer/tools.js";
import { createToolRegistry as delayCalcTools } from "../modules/delaycalc/tools.js";
import { createToolRegistry as randomizerTools } from "../modules/randomizer/tools.js";
import { createToolRegistry as sectionsTools } from "../modules/sections/tools.js";
import { createToolRegistry as lyricMelodyTools } from "../modules/lyricmelody/tools.js";
import { createToolRegistry as fxPresetsTools } from "../modules/fxpresets/tools.js";
import { createToolRegistry as timeSigTools } from "../modules/timesig/tools.js";
import { createToolRegistry as chordPadsTools } from "../modules/chordpads/tools.js";
import { createToolRegistry as snapshotsTools } from "../modules/snapshots/tools.js";
import { createToolRegistry as healthTools } from "../modules/health/tools.js";
import { createToolRegistry as notationTools } from "../modules/notation/tools.js";
import { createToolRegistry as drumReplaceTools } from "../modules/drumreplace/tools.js";
import { createToolRegistry as genArrangerTools } from "../modules/genarranger/tools.js";
import { createToolRegistry as setlistTools } from "../modules/setlist/tools.js";
import { createToolRegistry as groupRoutingTools } from "../modules/grouprouting/tools.js";
import { createToolRegistry as trackManagerTools } from "../modules/trackmanager/tools.js";
import { createToolRegistry as tempoSyncTools } from "../modules/temposync/tools.js";
import { createToolRegistry as mixSceneTools } from "../modules/mixscene/tools.js";
import { createToolRegistry as consoleTools } from "../modules/console/tools.js";
import { createToolRegistry as clipVersionsTools } from "../modules/clipversions/tools.js";
import { createToolRegistry as drumMapTools } from "../modules/drummap/tools.js";
import { createToolRegistry as midiGateTools } from "../modules/midigate/tools.js";
import { createToolRegistry as macrosTools } from "../modules/macros/tools.js";
import { createToolRegistry as stepSeqTools } from "../modules/stepseq/tools.js";
import { createToolRegistry as drumBusTools } from "../modules/drumbus/tools.js";
import { createToolRegistry as modMatrixTools } from "../modules/modmatrix/tools.js";
import { createToolRegistry as mixConsoleTools } from "../modules/mixconsole/tools.js";
import { createToolRegistry as trackColorTools } from "../modules/trackcolor/tools.js";
import { createToolRegistry as rackBuilderTools } from "../modules/rackbuilder/tools.js";
import { createToolRegistry as midiTransformTools } from "../modules/miditransform/tools.js";
import { createToolRegistry as midiLfoTools } from "../modules/midilfo/tools.js";
import { createToolRegistry as launchQuantTools } from "../modules/launchquant/tools.js";
import { createToolRegistry as sandboxTools } from "../modules/sandbox/tools.js";
import { createToolRegistry as clipGraphTools } from "../modules/clipgraph/tools.js";
import { createToolRegistry as tempoTapTools } from "../modules/tempotap/tools.js";
import { createToolRegistry as fxChainTools } from "../modules/fxchain/tools.js";

export function createMasterRegistry(): MasterRegistry {
  const m = new MasterRegistry();

  // --- Batch 1 (core) ---
  m.addModule({ id:"session", label:"Session & Tracks", icon:"🗂️", description:"Core control: tempo, tracks, solo/mute/arm.", registry: sessionTools() });
  m.addModule({ id:"chords",  label:"Chords & Progressions", icon:"🎹", description:"Generate progressions by genre and key.", registry: chordsTools() });
  m.addModule({ id:"drums",   label:"Drums & Patterns", icon:"🥁", description:"Drum patterns by genre with variations.", registry: drumsTools() });
  m.addModule({ id:"eq",      label:"EQ & Analysis", icon:"🎚️", description:"Frequency analysis, EQ presets and sidechain suggestions.", registry: eqTools() });

  // --- Batch 2 (mixing / sound / arrangement) ---
  m.addModule({ id:"arrangement", label:"Arrangement & Navigation", icon:"🎬", description:"Markers, playhead position and bar navigation.", registry: arrangementTools() });
  m.addModule({ id:"vocal",       label:"Vocal Chain & FX", icon:"🎤", description:"Full vocal chain: EQ, de-esser, compressor and creative FX.", registry: vocalTools() });
  m.addModule({ id:"sfx",         label:"SFX & Textures", icon:"🌫️", description:"Generate sound effects and ambient textures by category.", registry: sfxTools() });

  // --- Batch 3 (performance / composition / organization) ---
  m.addModule({ id:"melody",      label:"Melody Generator", icon:"🎼", description:"Melodies by scale and key with articulations.", registry: melodyTools() });
  m.addModule({ id:"performance", label:"Performance & Looper", icon:"🔴", description:"Loop recording, live mute, scenes and fills.", registry: performanceTools() });
  m.addModule({ id:"clips",       label:"Clips & Scenes", icon:"🎛️", description:"Organize clips by mood, launch groups and scenes.", registry: clipsTools() });
  m.addModule({ id:"takes",       label:"Takes & Comping", icon:"🎙️", description:"Multi-take recording, selection and automatic comping.", registry: takesTools() });
  m.addModule({ id:"colorizer",   label:"Clip Colorizer", icon:"🎨", description:"Color clips by velocity, pitch or duration.", registry: colorizerTools() });

  // --- Batch 4 (mixing / synthesis / advanced organization) ---
  m.addModule({ id:"mastering",   label:"Gain Staging & Levels", icon:"📊", description:"Analyze gain staging, headroom and match levels.", registry: masteringTools() });
  m.addModule({ id:"synth",       label:"Synth Patchbay", icon:"🔌", description:"Modular patchbay: add modules, connect ports and save patches.", registry: synthTools() });
  m.addModule({ id:"templates",   label:"Project Templates", icon:"📐", description:"Extract, list and apply templates from your project.", registry: templatesTools() });
  m.addModule({ id:"notes",       label:"Project Notes", icon:"📝", description:"Categorized notes with search, tags and export.", registry: notesTools() });
  m.addModule({ id:"groove",      label:"Groove & Humanize", icon:"🌀", description:"Extract and apply timing/velocity groove to MIDI clips.", registry: grooveTools() });
  m.addModule({ id:"automation",  label:"Automation & Curves", icon:"📈", description:"Automation lanes: smooth, transform and read envelopes.", registry: automationTools() });

  // --- Star modules (rich panels) ---
  m.addModule({ id:"organizer",   label:"Session Organizer", icon:"🧩", description:"Organization score, auto-organize, scene grouping, naming, analysis and genre templates.", registry: organizerTools() });
  m.addModule({ id:"fxchain",     label:"FX Chains", icon:"⛓️", description:"Pre-built effects chains by genre: apply, customize and analyze tracks.", registry: fxChainTools() });

  // --- Batch 6 (mixing / analysis / MIDI / arrangement) ---
  m.addModule({ id:"compressor",  label:"Compression & Dynamics", icon:"🗜️", description:"Dynamic range analysis, compression presets and multiband.", registry: compressorTools() });
  m.addModule({ id:"mixassistant",label:"AI Mixing Assistant", icon:"🎚️", description:"Analyze the mix, suggest EQ/compression and loudness targets.", registry: mixAssistantTools() });
  m.addModule({ id:"harmonizer",  label:"MIDI Harmonizer", icon:"🎵", description:"Harmony voices, voice leading and chord clips by scale degrees.", registry: harmonizerTools() });
  m.addModule({ id:"quantizer",   label:"Quantize & Swing", icon:"📐", description:"Quantize with strength and swing, groove presets by genre.", registry: quantizerTools() });
  m.addModule({ id:"delaycalc",   label:"Delay Calculator", icon:"⏱️", description:"Delay/reverb times from BPM and tap tempo.", registry: delayCalcTools() });
  m.addModule({ id:"randomizer",  label:"MIDI Randomizer", icon:"🎲", description:"Randomize pitch, velocity, timing and duration with constraints.", registry: randomizerTools() });
  m.addModule({ id:"sections",    label:"Arrangement Sections", icon:"🧱", description:"Detect, create, move and export arrangement sections.", registry: sectionsTools() });

  // --- Batch 7 (composition / FX / management / tuning) ---
  m.addModule({ id:"lyricmelody", label:"Lyric → Melody", icon:"✍️", description:"Analyze lyrics (syllables/stress) and generate melody + harmony.", registry: lyricMelodyTools() });
  m.addModule({ id:"fxpresets",   label:"FX Chain Presets", icon:"🎛️", description:"Save, search, apply and compare effects chains.", registry: fxPresetsTools() });
  m.addModule({ id:"timesig",     label:"Time Signature", icon:"🕐", description:"Time signatures, meter changes, map and polyrhythms.", registry: timeSigTools() });
  m.addModule({ id:"chordpads",   label:"Chord Pads", icon:"🎹", description:"Assign chords to pads, trigger them and configure layout.", registry: chordPadsTools() });
  m.addModule({ id:"snapshots",   label:"Snapshots", icon:"📸", description:"Save, load and manage set states.", registry: snapshotsTools() });
  m.addModule({ id:"health",      label:"Project Health", icon:"🩺", description:"Project health checks: dead tracks, plugins, CPU.", registry: healthTools() });

  // --- Batch 8 (hardware / conversion / live / routing) ---
  m.addModule({ id:"notation",    label:"Notation Viewer", icon:"🎼", description:"Notes as score, structured layout, PDF export and transposition.", registry: notationTools() });
  m.addModule({ id:"drumreplace", label:"Drum Replacer", icon:"🥁", description:"Analyze hits and replace/layer drums with kits.", registry: drumReplaceTools() });
  m.addModule({ id:"genarranger", label:"Generative Arranger", icon:"🌀", description:"Generate full arrangements with energy curve and variations.", registry: genArrangerTools() });
  m.addModule({ id:"setlist",     label:"Setlist Manager", icon:"📋", description:"Create setlists for live shows, add songs, reorder and export.", registry: setlistTools() });
  m.addModule({ id:"grouprouting",label:"Group Routing", icon:"🔗", description:"Create groups, add tracks and configure their routing.", registry: groupRoutingTools() });
  m.addModule({ id:"trackmanager",label:"Bulk Track Manager", icon:"🗂️", description:"Bulk actions: mute/solo/arm/color/volume/duplicate.", registry: trackManagerTools() });
  m.addModule({ id:"temposync",   label:"Tempo & Grid Sync", icon:"🕐", description:"Tempo, time sig, sync tracks, detect BPM and warp.", registry: tempoSyncTools() });

  // --- Batch 9 (mixing / utilities / sequencing / restoration) ---
  m.addModule({ id:"mixscene",    label:"Mix Scene Saver", icon:"🎚️", description:"Save, recall and compare mixer states.", registry: mixSceneTools() });
  m.addModule({ id:"console",     label:"API Console", icon:"⌨️", description:"Run Live API commands, scripts and explore the API.", registry: consoleTools() });
  m.addModule({ id:"clipversions",label:"Clip Versions", icon:"🕰️", description:"Clip version history: save, restore and diff.", registry: clipVersionsTools() });
  m.addModule({ id:"drummap",     label:"Drum Map Editor", icon:"🥁", description:"Map pads to MIDI notes, routing and drum map presets.", registry: drumMapTools() });
  m.addModule({ id:"midigate",    label:"MIDI Gate", icon:"🚪", description:"MIDI gate on audio, gate patterns and render.", registry: midiGateTools() });
  m.addModule({ id:"macros",      label:"Macro Mapper Pro", icon:"🎛️", description:"Macro mappings with curves, presets and batch.", registry: macrosTools() });
  m.addModule({ id:"stepseq",     label:"Step Sequencer", icon:"🔢", description:"Step sequencer: patterns, parameters and chains.", registry: stepSeqTools() });

  // --- Batch 10 (advanced mixing / synth / live / analysis) ---
  m.addModule({ id:"drumbus",     label:"Drum Bus Processor", icon:"🥁", description:"Bus compression, parallel, transient shaper and analysis.", registry: drumBusTools() });
  m.addModule({ id:"modmatrix",   label:"Modulation Matrix", icon:"🕸️", description:"Modulation matrix: add, tweak and toggle routings.", registry: modMatrixTools() });

  // --- Batch 11 (mixing / MIDI / FX / export) ---
  m.addModule({ id:"mixconsole",  label:"Mix Console View", icon:"🎛️", description:"Full mixer: faders, pan, sends, mute/solo and VU.", registry: mixConsoleTools() });
  m.addModule({ id:"trackcolor",  label:"Track Color Coordinator", icon:"🌈", description:"Color schemes for tracks and color map export.", registry: trackColorTools() });
  m.addModule({ id:"rackbuilder", label:"Rack Builder", icon:"🧰", description:"Create racks, add chains with zones and configure macros.", registry: rackBuilderTools() });
  m.addModule({ id:"miditransform",label:"MIDI Transformer", icon:"🔧", description:"Transpose, quantize, humanize, invert and arpeggiate MIDI.", registry: midiTransformTools() });
  m.addModule({ id:"midilfo",     label:"MIDI LFO", icon:"〰️", description:"MIDI LFO: target, waveform, bipolar and multi-target.", registry: midiLfoTools() });

  // --- Batch 12 (live / utilities / analysis / MIDI) ---
  m.addModule({ id:"launchquant", label:"Clip Launch Quantizer", icon:"⏯️", description:"Launch quantization global, per clip and per scene.", registry: launchQuantTools() });
  m.addModule({ id:"sandbox",     label:"Live Coding Sandbox", icon:"💻", description:"Evaluate TypeScript against the set, autocomplete and scripts.", registry: sandboxTools() });
  m.addModule({ id:"clipgraph",   label:"Clip Relation Graph", icon:"🕸️", description:"Graph of relationships between clips, patterns and suggestions.", registry: clipGraphTools() });
  m.addModule({ id:"tempotap",    label:"Tempo Tapper", icon:"👆", description:"Tap tempo, set from taps, auto-detect and history.", registry: tempoTapTools() });

  // --- Backend for the quick command palette (hidden: its UX is Cmd/Ctrl+K) ---
  m.addModule({ id:"quickactions", label:"Quick Actions", icon:"⌘", description:"Vocabulary of 1293 micro-actions (from the 215 *-action extensions).", hidden:true, registry: quickActionsTools() });

  return m;
}
