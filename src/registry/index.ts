// Single assembly point: adding a new module = one line here.
import { MasterRegistry } from "../core/registry.js";
import { createToolRegistry as sessionTools } from "../modules/session/tools.js";
import { createToolRegistry as resonanceTools } from "../modules/resonance/tools.js";
import { createToolRegistry as autogainTools } from "../modules/autogain/tools.js";
import { createToolRegistry as keyscaleTools } from "../modules/keyscale/tools.js";
import { createToolRegistry as genrhythmTools } from "../modules/genrhythm/tools.js";
import { createToolRegistry as texturemapTools } from "../modules/texturemap/tools.js";
import { createToolRegistry as spectrumCompareTools } from "../modules/spectrumcompare/tools.js";
import { createToolRegistry as projectSnapshotTools } from "../modules/projectsnapshot/tools.js";
import { createToolRegistry as scoreEditorTools } from "../modules/scoreeditor/tools.js";
import { createToolRegistry as clipVariationsTools } from "../modules/clipvariations/tools.js";
import { createToolRegistry as stemAlignTools } from "../modules/stemalign/tools.js";
import { createToolRegistry as sampleBrainTools } from "../modules/samplebrain/tools.js";
import { createToolRegistry as macroMorphTools } from "../modules/macromorph/tools.js";
import { createToolRegistry as loopDetectTools } from "../modules/loopdetect/tools.js";
import { createToolRegistry as warpCompareTools } from "../modules/warpcompare/tools.js";
import { createToolRegistry as paramDiffTools } from "../modules/paramdiff/tools.js";
import { createToolRegistry as phraseFinderTools } from "../modules/phrasefinder/tools.js";
import { createToolRegistry as safeRandomTools } from "../modules/saferandom/tools.js";
import { createToolRegistry as grooveTemplateTools } from "../modules/groovetemplate/tools.js";
import { createToolRegistry as probabilityLabTools } from "../modules/probabilitylab/tools.js";
import { createToolRegistry as veloCompressTools } from "../modules/velocompress/tools.js";
import { createToolRegistry as transposerTools } from "../modules/transposer/tools.js";
import { createToolRegistry as colorTheoryTools } from "../modules/colortheory/tools.js";
import { createToolRegistry as takeOrganizerTools } from "../modules/takeorganizer/tools.js";
import { createToolRegistry as audio2midiTools } from "../modules/audio2midi/tools.js";
import { createToolRegistry as historyTools } from "../modules/history/tools.js";
import { createToolRegistry as bassEngineTools } from "../modules/bassengine/tools.js";
import { createToolRegistry as sessionBridgeTools } from "../modules/sessionbridge/tools.js";
import { createToolRegistry as patternLangTools } from "../modules/patternlang/tools.js";
import { createToolRegistry as timeStretchTools } from "../modules/timestretch/tools.js";
import { createToolRegistry as drumSynthTools } from "../modules/drumsynth/tools.js";
import { createToolRegistry as sliceLabTools } from "../modules/slicelab/tools.js";
import { createToolRegistry as mosaicTools } from "../modules/mosaic/tools.js";
import { createToolRegistry as riserTools } from "../modules/riser/tools.js";
import { createToolRegistry as sub808Tools } from "../modules/sub808/tools.js";
import { createToolRegistry as padEngineTools } from "../modules/padengine/tools.js";
import { createToolRegistry as pluckEngineTools } from "../modules/pluckengine/tools.js";
import { createToolRegistry as acid303Tools } from "../modules/acid303/tools.js";
import { createToolRegistry as chordStabTools } from "../modules/chordstab/tools.js";
import { createToolRegistry as fmBellTools } from "../modules/fmbell/tools.js";
import { createToolRegistry as impactTools } from "../modules/impact/tools.js";
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
  m.addModule({ id:"arrangement", label:"Arrangement & Navigation", icon:"🎬", description:"Arrangement markers (locators) with genre song-structure templates — drop a whole song map, manage and clear locators.", registry: arrangementTools() });
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

  // --- Star modules (rich panels) ---
  m.addModule({ id:"organizer",   label:"Session Organizer", icon:"🧩", description:"Organization score, auto-organize, scene grouping, naming, analysis and genre templates.", registry: organizerTools() });
  m.addModule({ id:"fxchain",     label:"FX Chains", icon:"⛓️", description:"Pre-built effects chains by genre: apply, customize and analyze tracks.", registry: fxChainTools() });

  // --- Batch 6 (mixing / analysis / MIDI / arrangement) ---
  m.addModule({ id:"compressor",  label:"Compression & Dynamics", icon:"🗜️", description:"Dynamic range analysis, compression presets and multiband.", registry: compressorTools() });
  m.addModule({ id:"mixassistant",label:"AI Mixing Assistant", icon:"🎚️", description:"Analyze the mix, suggest EQ/compression and loudness targets.", registry: mixAssistantTools() });
  m.addModule({ id:"harmonizer",  label:"MIDI Harmonizer", icon:"🎵", description:"Harmony voices, voice leading and expressive chord progressions (spread, tensions, inversions, human feel, bass root, top line, arp).", registry: harmonizerTools() });
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
  m.addModule({ id:"console",     label:"API Console", icon:"⌨️", description:"Scripting console for the Set — safe commands that mutate it, arbitrary JS via run_script, and save/load scripts that persist to storage.", registry: consoleTools() });
  m.addModule({ id:"clipversions",label:"Clip Versions", icon:"🕰️", description:"Clip version history: save, restore and diff.", registry: clipVersionsTools() });
  m.addModule({ id:"drummap",     label:"Drum Map Editor", icon:"🥁", description:"Map pads to MIDI notes, routing and drum map presets.", registry: drumMapTools() });
  m.addModule({ id:"midigate",    label:"MIDI Gate", icon:"🚪", description:"MIDI gate on audio, gate patterns and render.", registry: midiGateTools() });
  m.addModule({ id:"macros",      label:"Macro Mapper Pro", icon:"🎛️", description:"Macro mappings with curves, presets and batch.", registry: macrosTools() });
  m.addModule({ id:"stepseq",     label:"Step Sequencer", icon:"🔢", description:"Step sequencer: patterns, parameters and chains.", registry: stepSeqTools() });

  // --- Batch 10 (advanced mixing / synth / live / analysis) ---
  m.addModule({ id:"drumbus",     label:"Drum Bus Processor", icon:"🥁", description:"Bus compression, parallel, transient shaper and analysis.", registry: drumBusTools() });

  // --- Batch 11 (mixing / MIDI / FX / export) ---
  m.addModule({ id:"mixconsole",  label:"Mix Console View", icon:"🎛️", description:"Full mixer: faders, pan, sends, mute/solo and VU.", registry: mixConsoleTools() });
  m.addModule({ id:"trackcolor",  label:"Track Color Coordinator", icon:"🌈", description:"Color schemes for tracks and color map export.", registry: trackColorTools() });
  m.addModule({ id:"rackbuilder", label:"Rack Builder", icon:"🧰", description:"Create racks, add chains with zones and configure macros.", registry: rackBuilderTools() });
  m.addModule({ id:"miditransform",label:"MIDI Transformer", icon:"🔧", description:"Transpose, quantize, humanize, invert and arpeggiate MIDI — plus a generative arp engine (modes, rate, octaves, variations).", registry: midiTransformTools() });
  m.addModule({ id:"midilfo",     label:"MIDI LFO", icon:"〰️", description:"MIDI LFO: target, waveform, bipolar and multi-target.", registry: midiLfoTools() });

  // --- Batch 12 (live / utilities / analysis / MIDI) ---
  m.addModule({ id:"launchquant", label:"Clip Launch Quantizer", icon:"⏯️", description:"Launch quantization global, per clip and per scene.", registry: launchQuantTools() });
  m.addModule({ id:"sandbox",     label:"Live Coding Sandbox", icon:"💻", description:"Evaluate TypeScript against the set, autocomplete and scripts.", registry: sandboxTools() });
  m.addModule({ id:"clipgraph",   label:"Clip Relation Graph", icon:"🕸️", description:"Graph of relationships between clips, patterns and suggestions.", registry: clipGraphTools() });
  m.addModule({ id:"tempotap",    label:"Tempo Tapper", icon:"👆", description:"Tap tempo, set from taps, auto-detect and history.", registry: tempoTapTools() });

  m.addModule({ id:"resonance",   label:"Resonance · Mix Radar", icon:"📡", description:"Renders stems to audio, FFT-analyzes them in-host and maps frequency masking across the whole set.", registry: resonanceTools() });
  m.addModule({ id:"autogain",    label:"Auto-Gain Stager", icon:"📏", description:"Measures real RMS/peak per audio track (render→FFT) and sets each fader to a reference level.", registry: autogainTools() });
  m.addModule({ id:"keyscale",    label:"Key & Scale Detective", icon:"🔑", description:"Detects the key/scale from a pitch-class histogram (Krumhansl–Schmuckler) and flags out-of-scale notes.", registry: keyscaleTools() });
  m.addModule({ id:"genrhythm",   label:"Generative Rhythm", icon:"🎲", description:"Rule-based probabilistic drum patterns (native note probability + velocity deviation), with a fill engine, auto-fills and re-shuffle with undo.", registry: genrhythmTools() });
  m.addModule({ id:"texturemap",  label:"Audio Texture Mapper", icon:"🌫️", description:"Renders an audio stem and maps its dominant spectral peaks per window to MIDI notes.", registry: texturemapTools() });
  m.addModule({ id:"spectrumcompare", label:"Spectrum Match", icon:"🔀", description:"Overlays two tracks' spectra (render→FFT) and highlights overlapping/masking bands.", registry: spectrumCompareTools() });
  m.addModule({ id:"projectsnapshot", label:"Project Snapshot · Git", icon:"📸", description:"Versions the whole Set to disk (storageDirectory): save, GitHub-style diff and restore.", registry: projectSnapshotTools() });
  m.addModule({ id:"scoreeditor",  label:"Score Editor", icon:"🎼", description:"Renders a clip as notation and exports/imports MusicXML (engrave + PDF in MuseScore/Sibelius/Dorico).", registry: scoreEditorTools() });
  m.addModule({ id:"clipvariations", label:"Clip Variation Engine", icon:"🎰", description:"Generates N algorithmic variations of a MIDI clip (rotate, reverse, humanize, arpeggiate…) as new clips.", registry: clipVariationsTools() });
  m.addModule({ id:"stemalign",   label:"Stem Aligner", icon:"🎯", description:"Cross-correlates two audio stems to find their time offset and shift the target into alignment.", registry: stemAlignTools() });
  m.addModule({ id:"samplebrain", label:"Sample Library Brain", icon:"🧠", description:"Indexes your samples to a JSON brain with a perceptual fingerprint; search by BPM/key/similarity and drop into the project.", registry: sampleBrainTools() });
  m.addModule({ id:"macromorph", label:"Macro Snapshot Morph", icon:"🎚️", description:"Captures a device's parameter state and morphs (lerps) between two snapshots — preset morphing Live doesn't have.", registry: macroMorphTools() });
  m.addModule({ id:"loopdetect",  label:"Loop Length Detective", icon:"🔍", description:"Estimates a loop's BPM from its audio and suggests a global song tempo to make it fit.", registry: loopDetectTools() });
  m.addModule({ id:"warpcompare", label:"Warp Mode A/B Comparator", icon:"🎧", description:"Renders a clip through Live's 6 warp modes for a blind A/B and writes the winner.", registry: warpCompareTools() });
  m.addModule({ id:"paramdiff",   label:"Param Diff & Outlier", icon:"🔬", description:"Compares the same device across N tracks and flags/normalizes outlier parameter values (sonic QA).", registry: paramDiffTools() });
  m.addModule({ id:"phrasefinder", label:"MIDI Phrase Finder", icon:"🔎", description:"Searches the Set's MIDI clips for a melodic pattern (transpose-aware) and highlights matches by color.", registry: phraseFinderTools() });
  m.addModule({ id:"saferandom",  label:"Safe Randomizer", icon:"🎲", description:"Instrument-aware bounded random of any device's parameters — per-param locks, a smart guard that keeps global volume/pan musical, and section targeting (osc/filter/env/lfo/fx).", registry: safeRandomTools() });
  m.addModule({ id:"groovetemplate", label:"Groove Template Extractor", icon:"🫀", description:"Extracts a clip's micro-timing groove and applies it to another clip — with per-element pocket locks and independent per-lane dynamics.", registry: grooveTemplateTools() });
  m.addModule({ id:"probabilitylab", label:"Probability Lab", icon:"🎰", description:"Variations using native note probability / releaseVelocity / velocityDeviation — patterns that breathe.", registry: probabilityLabTools() });
  m.addModule({ id:"velocompress", label:"Velocity Compressor", icon:"📊", description:"Treats a clip's note velocities like audio: histogram + downward compression (ratio/makeup) written in place.", registry: veloCompressTools() });
  m.addModule({ id:"transposer",  label:"Range Auto-Transposer", icon:"🎚️", description:"Tries the 25 semitone shifts and picks the one that fits the most notes into a target register.", registry: transposerTools() });
  m.addModule({ id:"colortheory", label:"Color Theory Palette", icon:"🎨", description:"Generates a harmonic palette (complementary/triadic/analogous…) and applies real clip.color values.", registry: colorTheoryTools() });
  m.addModule({ id:"takeorganizer", label:"Take Lane Organizer", icon:"🗄️", description:"Enumerates a track's take lanes and auto-labels them by content (register + note density).", registry: takeOrganizerTools() });
  m.addModule({ id:"audio2midi", label:"Audio → MIDI Melody", icon:"🎤", description:"Renders a monophonic audio part and transcribes it to a new MIDI clip via in-host YIN pitch tracking.", registry: audio2midiTools() });
  m.addModule({ id:"history", label:"Edit History", icon:"↩️", description:"Global undo for every destructive edit across the toolkit — undo the last change from any module, or per clip/track/device.", registry: historyTools() });
  m.addModule({ id:"bassengine", label:"Bass Engine", icon:"🎸", description:"Generates physical-feeling basslines (octave jumps, ghost hits, sub-hold) and mutates them while keeping the contour.", registry: bassEngineTools() });
  m.addModule({ id:"sessionbridge", label:"Session → Arrangement", icon:"🌉", description:"Lays every Session-view clip onto the Arrangement timeline scene by scene (MIDI notes + audio from file).", registry: sessionBridgeTools() });
  m.addModule({ id:"patternlang", label:"Pattern Language", icon:"🪄", description:"A TidalCycles-style mini-notation (notes, rests, [subdivisions], repeats*N) that compiles to a MIDI clip.", registry: patternLangTools() });
  m.addModule({ id:"timestretch", label:"Time-Stretch", icon:"⏱️", description:"In-host audio time-stretch (WSOLA overlap-add keeps pitch, or varispeed) that imports the result as a new clip.", registry: timeStretchTools() });
  m.addModule({ id:"drumsynth", label:"Drum Synth", icon:"🥁", description:"Synthesizes kick/snare/clap/hat sounds in-host (no samples), auditions them and imports the result as a new clip.", registry: drumSynthTools() });
  m.addModule({ id:"slicelab", label:"Slice Lab", icon:"🔪", description:"Slices a clip's audio and reorders/processes each step with pattern lanes (reverse, stutter, pitch, filter, bitcrush…) into a new loop.", registry: sliceLabTools() });
  m.addModule({ id:"mosaic", label:"Mosaic", icon:"🧩", description:"Generative loop variations from a clip's audio — seeded slice shuffle + chance-based per-slice FX, imported as new clips.", registry: mosaicTools() });
  m.addModule({ id:"riser", label:"Riser", icon:"🚀", description:"Synthesizes risers / sweeps / downlifters (noise + osc, pitch + filter sweep, FX) and imports them as a new clip.", registry: riserTools() });
  m.addModule({ id:"sub808", label:"808 Engine", icon:"🔊", description:"Synthesizes a tuned 808 / sub-bass in-host (pitch glide, long decay, saturation), auditions it and imports as a new clip.", registry: sub808Tools() });
  m.addModule({ id:"padengine", label:"Pad Engine", icon:"🌫️", description:"Synthesizes evolving pads/drones in-host (detuned-saw chord, moving filter, chorus, long envelopes) and imports as a new clip.", registry: padEngineTools() });
  m.addModule({ id:"pluckengine", label:"Pluck Engine", icon:"🎸", description:"Synthesizes plucked strings/harp in-host via Karplus-Strong, strumming a chord, and imports as a new clip.", registry: pluckEngineTools() });
  m.addModule({ id:"acid303", label:"Acid Engine", icon:"🧪", description:"Synthesizes a TB-303-style acid bassline in-host (resonant saw, per-note filter envelope, accent, slide) and imports as a new clip.", registry: acid303Tools() });
  m.addModule({ id:"chordstab", label:"Chord Stab", icon:"🎹", description:"Synthesizes short, punchy synth chord stabs in-host (saw stack through a fast filter envelope) and imports as a new clip.", registry: chordStabTools() });
  m.addModule({ id:"fmbell", label:"FM Bell", icon:"🔔", description:"2-operator FM synthesis in-host (bells / tines / e-piano) and imports the result as a new clip.", registry: fmBellTools() });
  m.addModule({ id:"impact", label:"Impact", icon:"💥", description:"Synthesizes cinematic impacts / booms / downlifters in-host (pitch-glided boom + noise crack + reverb tail) and imports as a new clip.", registry: impactTools() });

  // --- Backend for the quick command palette (hidden: its UX is Cmd/Ctrl+K) ---
  m.addModule({ id:"quickactions", label:"Quick Actions", icon:"⌘", description:"84 curated one-click presets that route to real tools — browse by group, or search them in the Cmd-K palette.", registry: quickActionsTools() });

  return m;
}
