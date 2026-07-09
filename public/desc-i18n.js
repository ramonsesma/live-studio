// Live Studio — Spanish translations for module/tool descriptions shown in the UI
// (autoform, command palette, panel headers). The registry's English `description` field
// stays untouched in src/modules/*/tools.ts — it's what the AI copilot's LLM prompt reads
// (find_tools/run_tool), and English tool-calling metadata is the safer, more consistent
// choice across providers. This file is purely a display-layer dictionary, same pattern as
// i18n.js: one shared codebase, translations as data. Keyed by module id (modules) and by
// fully-qualified tool name "<module>__<tool>" (tools). Falls back to the English text
// (passed in as `fallback`) for any key not yet translated here — so a partial dictionary
// never breaks the UI.
window.LiveStudioDescI18n = (function () {
  const MODULES = {
    session: "Control base: tempo, pistas, solo/mute/arm.",
    chords: "Genera progresiones por género y tonalidad.",
    drums: "Patrones de batería por género con variaciones.",
    eq: "Análisis de frecuencias, presets de EQ y sugerencias de sidechain.",
    arrangement: "Marcadores de arreglo (locators) con plantillas de estructura por género — coloca un mapa de canción completo, gestiona y borra locators.",
    vocal: "Cadena vocal completa: EQ, de-esser, compresor y FX creativos.",
    sfx: "Genera efectos de sonido y texturas ambientales por categoría.",
    melody: "Melodías por escala y tonalidad con articulaciones.",
    performance: "Grabación en loop, mute en vivo, escenas y fills.",
    clips: "Organiza clips por mood, grupos de disparo y escenas.",
    takes: "Grabación multi-take, selección y comping automático.",
    colorizer: "Colorea clips por velocity, pitch o duración.",
    mastering: "Analiza gain staging, headroom y nivela pistas.",
    synth: "Patchbay modular: añade módulos, conecta puertos y guarda patches.",
    templates: "Extrae, lista y aplica plantillas de tu proyecto.",
    notes: "Notas categorizadas con búsqueda, etiquetas y exportación.",
    groove: "Extrae y aplica groove de timing/velocity a clips MIDI.",
    organizer: "Puntuación de organización, auto-organización, agrupado de escenas, nombrado, análisis y plantillas por género.",
    fxchain: "Cadenas de efectos prediseñadas por género: aplica, personaliza y analiza pistas.",
    compressor: "Análisis de rango dinámico, presets de compresión y multibanda.",
    mixassistant: "Analiza la mezcla, sugiere EQ/compresión y objetivos de loudness.",
    harmonizer: "Voces de armonía, voice leading y progresiones expresivas (spread, tensiones, inversiones, human feel, bajo raíz, voz superior, arpegio).",
    quantizer: "Cuantiza con intensidad y swing, presets de groove por género.",
    delaycalc: "Tiempos de delay/reverb a partir del BPM y tap tempo.",
    randomizer: "Aleatoriza pitch, velocity, timing y duración con restricciones.",
    sections: "Detecta, crea, mueve y exporta secciones de arreglo.",
    lyricmelody: "Analiza letras (sílabas/acentuación) y genera melodía + armonía.",
    fxpresets: "Guarda, busca, aplica y compara cadenas de efectos.",
    timesig: "Compases, cambios de métrica, mapa y polirritmos.",
    chordpads: "Asigna acordes a pads, dispáralos y configura el layout.",
    health: "Chequeos de salud del proyecto: pistas muertas, plugins, CPU.",
    notation: "Notas como partitura, layout estructurado, exportación PDF y transposición.",
    drumreplace: "Analiza golpes y reemplaza/superpone batería con kits.",
    genarranger: "Genera arreglos completos con curva de energía y variaciones.",
    setlist: "Crea setlists para directo, añade canciones, reordena y exporta.",
    grouprouting: "Crea grupos, añade pistas y configura su ruteo.",
    trackmanager: "Acciones en lote: mute/solo/arm/color/volumen/duplicar.",
    temposync: "Control del tempo maestro e info real de rejilla/compás.",
    mixscene: "Guarda, recupera y compara estados del mezclador.",
    console: "Consola de scripting para el Set — comandos seguros que lo mutan, JS arbitrario vía run_script, y guarda/carga scripts persistidos en almacenamiento.",
    clipversions: "Historial de versiones de clips: guarda, restaura y compara.",
    drummap: "Mapea pads a notas MIDI, ruteo y presets de drum map.",
    midigate: "Escribe clips reales de patrón de gate MIDI (densidad euclidiana, swing, acentos) para sidechainear un device Gate.",
    macros: "Mapeos de macro con curvas, presets y por lotes.",
    stepseq: "Secuenciador de pasos: patrones, parámetros y cadenas.",
    drumbus: "Compresión de bus, paralela, transient shaper y análisis.",
    mixconsole: "Mezclador completo: faders (dB), pan, sends y mute/solo — se refresca en vivo. Sin VU: el SDK no expone medición en vivo.",
    trackcolor: "Esquemas de color para pistas y exportación del mapa de colores.",
    rackbuilder: "Crea racks, añade chains con zonas y configura macros.",
    miditransform: "Transpón, cuantiza, humaniza, invierte y arpegia MIDI — más un motor de arpegio generativo (modos, rate, octavas, variaciones).",
    midilfo: "LFO MIDI: destino, forma de onda, bipolar y multi-destino.",
    launchquant: "Cuantización de lanzamiento global, por clip y por escena.",
    sandbox: "Evalúa TypeScript contra el set, autocompletado y scripts.",
    clipgraph: "Grafo de relaciones entre clips, patrones y sugerencias.",
    tempotap: "Tap tempo, ajusta desde los taps, autodetección e historial.",
    resonance: "Renderiza stems a audio, los analiza con FFT en el host y mapea el masking de frecuencias en todo el set.",
    autogain: "Mide RMS/peak real por pista de audio (render→FFT) y ajusta cada fader a un nivel de referencia.",
    keyscale: "Detecta la tonalidad/escala a partir de un histograma de clases de altura (Krumhansl–Schmuckler) y marca notas fuera de escala.",
    genrhythm: "Patrones de batería probabilísticos basados en reglas (probabilidad nativa de nota + desviación de velocity), con motor de fills, auto-fills y re-shuffle con undo.",
    texturemap: "Renderiza un stem de audio y mapea sus picos espectrales dominantes por ventana a notas MIDI.",
    spectrumcompare: "Superpone los espectros de dos pistas (render→FFT) y resalta bandas solapadas/de masking.",
    projectsnapshot: "Versiona todo el Set en disco (storageDirectory): guarda, compara estilo GitHub y restaura.",
    scoreeditor: "Renderiza un clip como partitura y exporta/importa MusicXML (grabado + PDF en MuseScore/Sibelius/Dorico).",
    clipvariations: "Genera N variaciones algorítmicas de un clip MIDI (rotar, invertir, humanizar, arpegiar…) como clips nuevos.",
    stemalign: "Correlaciona cruzadamente dos stems de audio para hallar su desfase temporal y desplaza el objetivo para alinearlo.",
    samplebrain: "Indexa tus samples en un cerebro JSON con huella perceptual; busca por BPM/tonalidad/similitud y suéltalos en el proyecto.",
    macromorph: "Captura el estado de parámetros de un device y hace morph (interpolación) entre dos snapshots — algo que Live no tiene de forma nativa.",
    loopdetect: "Estima el BPM de un loop a partir de su audio y sugiere un tempo global de canción para que encaje.",
    warpcompare: "Renderiza un clip a través de los 6 modos de warp de Live para un A/B a ciegas y aplica el ganador.",
    paramdiff: "Compara el mismo device entre N pistas y marca/normaliza valores de parámetro atípicos (QA sonoro).",
    phrasefinder: "Busca en los clips MIDI del Set un patrón melódico (sensible a transposición) y resalta coincidencias por color.",
    saferandom: "Aleatorización acotada y consciente del instrumento sobre los parámetros de cualquier device — bloqueos por parámetro, una guarda inteligente que mantiene volumen/pan global musicales, y targeting por sección (osc/filtro/env/lfo/fx).",
    groovetemplate: "Extrae el groove de micro-timing de un clip y lo aplica a otro — con bloqueos de pocket por elemento y dinámica independiente por lane.",
    probabilitylab: "Variaciones usando probabilidad nativa de nota / releaseVelocity / velocityDeviation — patrones que respiran.",
    velocompress: "Trata las velocities de las notas de un clip como audio: histograma + compresión descendente (ratio/makeup) escrita en el propio clip.",
    transposer: "Prueba los 25 desplazamientos de semitono y elige el que encaja más notas en un registro objetivo.",
    colortheory: "Genera una paleta armónica (complementaria/triádica/análoga…) y aplica valores reales de clip.color.",
    takeorganizer: "Enumera los take lanes de una pista y los auto-etiqueta por contenido (registro + densidad de notas).",
    audio2midi: "Renderiza una parte de audio monofónica y la transcribe a un clip MIDI nuevo vía pitch tracking YIN en el host.",
    history: "Undo global para toda edición destructiva en todo el toolkit — deshace el último cambio de cualquier módulo, o por clip/pista/device.",
    bassengine: "Genera líneas de bajo con sensación física (saltos de octava, ghost hits, sub-hold) y las muta manteniendo el contorno.",
    sessionbridge: "Coloca cada clip de la vista Session sobre la timeline de Arrangement escena por escena (notas MIDI + audio desde archivo).",
    patternlang: "Una mini-notación al estilo TidalCycles (notas, silencios, [subdivisiones], repeats*N) que compila a un clip MIDI.",
    timestretch: "Time-stretch de audio en el host (WSOLA overlap-add mantiene el pitch, o varispeed) que importa el resultado como clip nuevo.",
    drumsynth: "Sintetiza sonidos de kick/snare/clap/hat en el host (sin samples), los audiciona e importa el resultado como clip nuevo.",
    slicelab: "Trocea el audio de un clip y reordena/procesa cada paso con lanes de patrón (reverse, stutter, pitch, filtro, bitcrush…) en un loop nuevo.",
    mosaic: "Variaciones generativas de loop a partir del audio de un clip — shuffle de slices con semilla + FX por slice basado en probabilidad, importadas como clips nuevos.",
    riser: "Sintetiza risers / sweeps / downlifters (ruido + osc, barrido de pitch + filtro, FX) y los importa como clip nuevo.",
    sub808: "Sintetiza un 808 / sub-bass afinado en el host (glide de pitch, decay largo, saturación), lo audiciona e importa como clip nuevo.",
    padengine: "Sintetiza pads/drones evolutivos en el host (acorde de sierra desafinada, filtro en movimiento, chorus, envolventes largas) e importa como clip nuevo.",
    pluckengine: "Sintetiza cuerdas pulsadas/arpa en el host vía Karplus-Strong, rasgueando un acorde, e importa como clip nuevo.",
    acid303: "Sintetiza una línea de bajo acid estilo TB-303 en el host (sierra resonante, envolvente de filtro por nota, accent, slide) e importa como clip nuevo.",
    chordstab: "Sintetiza stabs de acorde cortos y contundentes en el host (stack de sierras a través de una envolvente de filtro rápida) e importa como clip nuevo.",
    fmbell: "Síntesis FM de 2 operadores en el host (campanas / tines / e-piano) e importa el resultado como clip nuevo.",
    impact: "Sintetiza impactos cinemáticos / booms / downlifters en el host (boom con glide de pitch + crack de ruido + cola de reverb) e importa como clip nuevo.",
    subbass: "Sintetiza un sub-bass tonal sostenido en el host (seno + armónicos superiores + drive) e importa como clip nuevo.",
    organ: "Órgano de drawbars aditivo en el host (ratios Hammond por nota del acorde, percusión, vibrato) importado como clip nuevo.",
    vocalchop: "Sintetiza una textura vocal troceada en el host (sierra filtrada por formantes, gateada en pasos rítmicos) e importa como clip nuevo.",
    instrumentrender: "Renderiza cualquier clip MIDI (acordes, melodía, bajo, batería, arpegio, patrón…) a través de cualquier motor del host en un clip de audio nuevo. El puente entre nuestros motores y cualquier generador MIDI.",
    brass: "Sintetiza una sección de metales synth en el host (sierras apiladas a través de una envolvente de filtro resonante con vibrato) e importa como clip nuevo.",
    wobble: "Sintetiza un wobble bass sincronizado al tempo en el host (stack de sierras + paso-bajo modulado por LFO + sub) e importa como clip nuevo.",
    choir: "Sintetiza un coro / pad vocal en el host (sierras desafinadas a través de formantes vocales, ataque lento, chorus) e importa como clip nuevo.",
    subdrop: "Sintetiza un sub-drop / downlifter en el host (glide descendente de seno con click y capa de sub) para transiciones.",
    pluckbass: "Sintetiza un tono de bajo pulsado con dedos (Karplus-Strong en registro de bajo + sub + drive).",
    sawlead: "Sintetiza un lead de supersaw desafinado a través de un filtro resonante — el lead clásico de trance / EDM.",
    reese: "Sintetiza un Reese bass gruñón (dos sierras desafinadas y batiendo, LFO lento en el cutoff, saturación).",
    marimba: "Sintetiza un tono de mazo de madera / xilófono (seno + parciales impares inarmónicos, decay rápido, click suave).",
    glitch: "Mosaico de micro-slices guiado por semilla, cada uno procesado al azar (reverse, bitcrush, stutter) — clips de FX estilo IDM.",
    tapehiss: "Lecho de ruido de banda limitada rosáceo con wow/flutter y crepitaciones — una capa de textura lo-fi de vinilo/cinta.",
    trumpet: "Trompeta synth de una voz / metal solista (sierra a través de un pasa-banda de formante con vibrato).",
    epiano: "Piano eléctrico estilo Rhodes / DX7 (FM de 2 operadores con índice bajo, martillo suave, sustain largo).",
    musicbox: "Tine de caja de música (seno + parciales impares metálicos inarmónicos, decay rápido).",
    harp: "Karplus-Strong de sustain largo rasgueado a través de un acorde — cuerdas pulsadas estilo arpa / glissando.",
    whistle: "Silbido synth casi puro (seno + vibrato ligero + ruido de aliento en el ataque).",
    subwobble: "Wobble de sub-bass con el LFO en amplitud (trémolo) — encaja bajo un bajo Reese / dubstep.",
    vocoder: "Palabras de vocoder sintéticas — portadora de sierra formada por filtros de formante vocálico gateados por paso.",
    noisefx: "Transiciones cortas de ruido puro (sweep arriba, sweep abajo, risetail, whoosh) para fills y acentos.",
    cymbal: "Crash / ride / china — parciales metálicos + ruido brillante + decay largo.",
    guitar: "Cuerda Karplus-Strong (o power chord) a través de distorsión hard-clip y un filtro resonante, con palm mute opcional.",
    sitar: "Cuerda Karplus-Strong con buzz de puente no lineal y shimmer de cuerdas simpáticas.",
    steeldrum: "Tono de steel-pan (seno + parciales inarmónicos característicos del steel-pan + click de mazo suave).",
    accordion: "Dos osciladores de lengüeta desafinados por nota (musette) con timbre de lengüeta de seno recortado y una envolvente de fuelle lenta.",
    theremin: "Seno puro con glide de portamento continuo entre dos notas, vibrato amplio, sin transiente de ataque.",
    hihat808: "Hi-hat metálico clásico estilo 808 (seis parciales de onda cuadrada, filtrado paso-alto), cerrado o abierto.",
    stabhit: "Un stab de metales/orquesta muy corto y contundente (stack de sierras + snap de filtro rápido + transiente de ruido).",
    glassbell: "Campana de cristal cristalina (parciales aditivos inarmónicos, más brillante y fría que FM Bell).",
    subkick: "Capa de sub pura afinada al fundamental de un kick — superponla bajo el kick de Drum Synth para más graves.",
    reversesweep: "Un crecimiento de ruido/tono ascendente que se detiene en seco en un golpe — transición de cymbal invertido hacia un downbeat.",
    devremote: "Controla remotamente cada parámetro de cualquier device ya presente en una pista — incluyendo instrumentos Max for Live — con snapshots y undo.",
    stemexport: "Renderiza en lote cada pista de audio a un WAV real en disco con nombrado automático — las pistas MIDI se omiten, no se simulan.",
    mixcoach: "Combina análisis real de salud/masking/gain-staging en una única lista priorizada de próximos pasos concretos, cada uno con la tool exacta para ejecutarlo.",
    quickactions: "90 presets curados de un clic que enrutan a tools reales — navega por grupo, o búscalas en la paleta Cmd-K.",
    stripsilence: "Mapea el silencio real de un clip desde su envolvente RMS medida, y recorta inicio/cola o divide por región de sonido en archivos nuevos importados.",
    transients: "Detección real de transientes expuesta como tools: lista los transientes de un clip, trocea por golpe, o cuantiza el audio a la rejilla sin el motor Warp de Live.",
    clipeditor: "Ediciones de región a nivel de sample sobre el audio real de un clip (recorte/silencio/ganancia/fades) renderizadas a un archivo nuevo — el original queda intacto.",
    audioconvert: "Conversión real dentro de Live: resamplea el audio de un clip, aplica ganancia, o normaliza por RMS a una sonoridad objetivo con techo seguro de picos.",
    extremestretch: "Estiramiento granular extremo 2-200x sin cambio de pitch — nuestro propio motor de granos con semilla convierte cualquier cosa en pads evolutivos.",
    reverseverb: "Construye el clásico swell de reverb invertida desde el audio REAL de un clip (invertir → reverb → voltear de vuelta), desembocando en el original.",
    iterate: "Pasa un clip por una cadena de degradación N veces (lofi/saturación/smear/oscurecer) — decaimiento estilo generaciones de cinta con archivos intermedios opcionales.",
    retime: "Reescala el timing de las notas de un clip entre interpretaciones de BPM — half-time, double-time o cualquier factor — con undo.",
    linkedclips: "Grupos de clips maestro/esclavo: vincula clips de Session y propaga las notas de un miembro a todos los demás en una llamada — persistido, deshacible.",
    drumextract: "Divide los pads ACTIVOS de un Drum Rack (notas que realmente suenan en el clip) en pistas MIDI nuevas separadas, una por pad.",
    cuesheet: "Convierte los cue points reales del Set en un cue sheet de mixtape (.cue/.txt) escrito en almacenamiento — tiempos desde beats al tempo actual.",
    imagemidi: "Convierte la rejilla de luminancia de una imagen en notas reales mapeadas a escala — el panel decodifica cualquier imagen, la tool escribe el clip.",
  };

  const TOOLS = {
    session__get_session_info: "Obtén info completa de la sesión: tempo, escala, conteo de pistas/escenas.",
    session__get_all_tracks: "Obtén todas las pistas con resumen de estado.",
    session__set_tempo: "Ajusta el tempo en BPM (20-999).",
    session__create_midi_track: "Crea una pista MIDI.",
    session__create_audio_track: "Crea una pista de audio.",
    session__rename_track: "Renombra una pista.",
    session__set_track_solo: "Activa/desactiva el solo de una pista.",
    session__set_track_mute: "Activa/desactiva el mute de una pista.",
    session__set_track_arm: "Activa/desactiva el armado para grabación de una pista.",

    chords__get_progressions: "Obtén progresiones disponibles por género",
    chords__generate_chords: "Genera MIDI de una progresión de acordes",
    chords__get_keys: "Obtén las tonalidades musicales disponibles",
    chords__voice_lead: "Reasigna voces a las notas reales del clip de acordes de la pista (close/open/drop2, deshacible)",

    drums__get_genres: "Lista los géneros de patrones de batería disponibles",
    drums__generate_pattern: "Genera un patrón de batería en una pista MIDI",
    drums__add_variation: "Añade una variación real al clip de patrón de batería existente de la pista (deshacible)",

    eq__apply_eq_preset: "Aplica un preset de EQ a una pista",
    eq__suggest_eq: "Obtén sugerencias de EQ a partir del espectro REAL renderizado de la pista (si no se puede renderizar, recurre a puntos de partida genéricos)",
    eq__get_sidechain_suggestions: "Obtén sugerencias de compresión por sidechain con un release real sincronizado al tempo y (cuando ambas pistas se pueden renderizar) una comprobación real de solape en graves",

    arrangement__list_cue_templates: "Lista las plantillas de estructura por género (secciones + compases)",
    arrangement__apply_cue_template: "Coloca una plantilla de estructura por género en el arreglo como locators con nombre (cue points), ajustando opcionalmente el tempo",
    arrangement__clear_markers: "Borra TODOS los marcadores de arreglo (cue points / locators)",
    arrangement__delete_marker: "Borra un único marcador de arreglo por índice (ordenados por tiempo) o por nombre",
    arrangement__rename_marker: "Renombra un marcador de arreglo por índice (ordenados por tiempo)",
    arrangement__get_markers: "Lista todos los marcadores de arreglo",
    arrangement__add_marker: "Añade un marcador de arreglo (cue point) en una posición temporal",

    vocal__setup_chain: "Configura una cadena completa de procesamiento vocal en una pista",
    vocal__set_deesser: "Ajusta los parámetros del de-esser en el device Multiband Dynamics de la pista (deshacible) — requiere que setup_chain haya añadido uno antes",
    vocal__set_vocal_eq: "Ajusta bandas en el device EQ Eight de la pista (deshacible) — requiere que setup_chain haya añadido uno antes",
    vocal__set_vocal_comp: "Ajusta el device Compressor de la pista (deshacible) — requiere que setup_chain haya añadido uno antes",
    vocal__add_vocal_fx: "Inserta un device de FX creativo real en la pista vocal si existe un device nativo de Live equivalente; si no, es advisory",

    sfx__get_categories: "Obtén categorías de SFX y sonidos disponibles",
    sfx__generate_sfx: "Genera un efecto de sonido en una pista",
    sfx__create_ambient_texture: "Crea una textura ambiental",
    sfx__add_automation: "Añade automatización de parámetro a la pista de SFX (advisory — el SDK no tiene API de escritura de automatización de arreglo para dibujar una curva en el tiempo)",

    melody__get_scales: "Obtén las escalas musicales disponibles",
    melody__generate_melody: "Genera una melodía en una pista MIDI",
    melody__apply_articulation: "Aplica articulación a las notas reales del clip de melodía de la pista (deshacible)",

    performance__start_loop_recording: "Lista las pistas armadas que recibirían grabación en loop (advisory — el SDK no tiene control de transporte/grabación para iniciarla de verdad)",
    performance__toggle_mute: "Activa/desactiva el mute de una pista para directo (deshacible — real)",
    performance__set_performance_mode: "Cambia entre vista Session y Arrangement (advisory — el SDK no tiene API para cambiar la vista principal de Live)",
    performance__create_performance_scene: "Crea una escena real",
    performance__get_performance_state: "Obtén el estado actual de directo (isPlaying/metronome/currentScene siempre son null — el SDK no tiene API de lectura del estado de transporte)",
    performance__trigger_fill: "Dispara un fill/transición (advisory — el SDK no tiene control de transporte/disparo de clip para disparar algo de verdad en tiempo real)",

    clips__get_clips: "Obtén todos los clips de la sesión",
    clips__create_launch_group: "Crea un grupo de disparo de clips (advisory — el SDK no tiene el concepto de launch-group / crossfade-group)",
    clips__reset_clip: "Restablece un clip a su estado importado: loop al span completo, des-mutear, y (cuando el SDK los expone) pitch/ganancia a neutro — sondea qué es realmente ajustable y lo reporta (deshacible)",
    clips__batch_rename: "Renombra en lote los clips REALES de una pista con un patrón — tokens {track} {n} {name} {len}; sufijo de versión 'v1' opcional (deshacible como una entrada)",
    clips__auto_tag_clips: "Analiza los clips reales de una pista y deriva etiquetas de sus notas/nombre — opcionalmente escribe las #etiquetas en el nombre de cada clip (escritura real de clip.name; Live no tiene campo de etiquetas)",
    clips__launch_scene: "Dispara una escena con todos sus clips (advisory — el SDK no tiene API de transporte/disparo de clip; esto solo confirma que la escena existe)",

    takes__prepare_recording: "Arma la pista para grabar (escritura real de track.arm); count-in/auto-punch son advisory — sin equivalente en el SDK",
    takes__list_takes: "Lista todos los takes grabados de una pista (real — lee Track.takeLanes)",
    takes__select_best_takes: "Auto-selecciona las mejores secciones entre takes (advisory — el SDK no tiene API de análisis de audio para comparar la calidad de los takes)",
    takes__comp_from_takes: "Crea una pista de audio real para el comp (advisory — el SDK no tiene API de splicing de audio para ensamblarlo de verdad a partir de secciones de takes)",

    colorizer__get_track_clips: "Lista todos los clips de una pista MIDI/audio",
    colorizer__color_by_velocity: "Colorea los clips de una pista según su velocity media (escritura real de clip.color)",
    colorizer__color_by_pitch: "Colorea los clips de una pista según su pitch medio (escritura real de clip.color)",
    colorizer__color_by_duration: "Colorea los clips de una pista según su duración (escritura real de clip.color)",
    colorizer__clear_clip_colors: "Restablece los colores de clip de una pista a un gris neutro",
    colorizer__color_by_role: "Colorea clips según su rol de contenido real (batería/bajo/lead/pad/audio, inferido de las notas reales) — en una pista o en todo el proyecto en una sola llamada (escritura real de clip.color, deshacible)",

    mastering__analyze_gain_structure: "Analiza el gain staging en todas las pistas y devices",
    mastering__set_target_level: "Ajusta el fader de una pista a un nivel objetivo en dB",
    mastering__auto_gain_stage: "Ajusta el fader de una pista para dejar un headroom objetivo por debajo de 0 dBFS",
    mastering__match_levels: "Nivela el volumen entre las pistas seleccionadas",

    synth__add_module: "Añade un módulo al patchbay (persiste en disco)",
    synth__connect_ports: "Conecta una salida a una entrada (persiste en disco; valida que ambos IDs de módulo existan)",
    synth__signal_flow_visual: "Obtén el flujo de señal persistido para visualización",

    templates__analyze_project: "Analiza la estructura REAL del proyecto actual (pistas, tipo, cadenas de devices reales)",
    templates__extract_template: "Extrae la estructura real de pistas/devices del proyecto actual como plantilla reutilizable (persiste en disco)",
    templates__apply_template: "Asistente de un clic: crea pistas reales (+ cadenas de devices reales best-effort) desde un starter kit de género incorporado O una plantilla guardada",
    templates__list_templates: "Lista plantillas guardadas y los starter kits de género de un clic incorporados",

    notes__add_note: "Añade una nota del proyecto (persiste en disco)",
    notes__get_notes: "Obtén todas las notas del proyecto",
    notes__update_note: "Actualiza una nota existente",
    notes__delete_note: "Borra una nota",
    notes__export_notes: "Exporta notas como texto/markdown/json",

    groove__extract_groove: "Extrae el timing de groove de un clip MIDI",
    groove__apply_groove: "Humaniza/aplica groove al timing y velocity de un clip MIDI",
    groove__save_groove: "Extrae el groove real de timing/velocity de un clip y guárdalo como plantilla con nombre (persiste en disco)",
    groove__list_grooves: "Lista las plantillas de groove guardadas",
    groove__extract_velocity: "Extrae el patrón de velocity de un clip como groove",

    organizer__get_session_summary: "Obtén un resumen completo de la sesión con recomendaciones de organización",
    organizer__auto_organize_tracks: "Renombra pistas por categoría (real). createFolders es advisory — el SDK no tiene API para crear grupos/carpetas de pistas.",
    organizer__group_scenes: "Clasifica escenas en secciones lógicas (intro, verso, estribillo…) y opcionalmente las renombra in situ con un prefijo [Sección] (escritura real de scene.name)",
    organizer__standardize_naming: "Aplica nombrado estandarizado a todas las pistas y escenas",
    organizer__analyze_session_structure: "Analiza la estructura de la sesión y ofrece sugerencias de optimización",
    organizer__create_session_template: "Crea una plantilla de sesión REAL y reutilizable basada en el género — persiste en disco y se puede aplicar de verdad vía templates__apply_template",
    organizer__export_session_info: "Exporta información de la sesión en varios formatos",

    fxchain__add_device_to_all: "Inserta un device en CADA pista de una vez (llama de verdad a insertDevice por pista) — opcionalmente solo pistas MIDI o solo audio, al inicio o final de la cadena",
    fxchain__get_effects_chains: "Obtén todas las cadenas de efectos disponibles",
    fxchain__apply_effects_chain: "Aplica una cadena de efectos prediseñadas a pistas",
    fxchain__get_preset_chains: "Obtén cadenas de efectos preset para géneros específicos",
    fxchain__create_custom_chain: "Crea una cadena de efectos personalizada",

    compressor__apply_compression_preset: "Aplica un preset de compresión a una pista",
    compressor__multi_band_compress: "Ajustes sugeridos de compresión multibanda (advisory — el ratio por banda no se puede ajustar vía el SDK)",
    compressor__auto_gain_staging: "Auto-ajusta el gain staging en todas las pistas",

    mixassistant__suggest_compression: "Obtén un preset de compresión de punto de partida para un tipo de instrumento (una tabla de referencia, no análisis — la compresión real por pista vive en el módulo Compression & Dynamics)",
    mixassistant__reference_match: "Iguala el fader/pan real de las pistas objetivo a una pista de referencia (el eje de loudness es real y se puede aplicar; el matching tonal/EQ necesita render de audio — ver resonance__mask_matrix)",
    mixassistant__suggest_eq: "Obtén sugerencias de EQ a partir del espectro REAL renderizado de la pista (si no se puede renderizar, recurre a puntos de partida genéricos)",

    harmonizer__detect_chords: "Identifica los acordes de un clip MIDI: agrupa notas simultáneas y nombra cada una (tónica + calidad)",
    harmonizer__suggest_next: "Sugiere probables acordes siguientes por armonía funcional, a partir de una tonalidad + acorde actual (o auto-detectado de un clip)",
    harmonizer__generate_expressive: "Genera un clip de progresión de acordes expresiva: spread, tensiones, inversiones, human feel, bajo raíz, voz superior y arpegio opcional",
    harmonizer__vary_progression: "Propón variaciones de progresión: bloquea acordes favoritos y re-baraja el resto con sustituciones diatónicas",
    harmonizer__apply_comp: "Aplica un ritmo de comping (Charleston, anticipación, stabs, sustained-top, arpegiar) a un clip de acordes — con swing y humanize DETERMINISTA",
    harmonizer__get_voicings: "Obtén los tipos de voicing de acorde disponibles",
    harmonizer__harmonize_note: "Añade voces de armonía apiladas sobre las notas de un clip (escritura real de notas)",
    harmonizer__apply_voice_leading: "Aplica voice leading a un clip de progresión de acordes",
    harmonizer__generate_chord_clip: "Genera un clip MIDI de progresión de acordes a partir de grados de escala",

    quantizer__get_clip_info: "Obtén info de timing de un clip MIDI",
    quantizer__quantize: "Cuantiza un clip MIDI con intensidad y swing",
    quantizer__apply_swing: "Aplica una plantilla de swing al clip",
    quantizer__get_swing_presets: "Lista los presets de swing disponibles",
    quantizer__groove_extract: "Extrae el groove de un clip y aplícalo a otro",

    delaycalc__get_bpm: "Obtén el BPM actual del proyecto",
    delaycalc__calculate: "Calcula tiempos de delay/reverb a partir del BPM",
    delaycalc__apply_delay: "Ajusta el tiempo de un delay a partir del cálculo",
    delaycalc__get_tempo_tap: "Tap para calcular el BPM a partir del intervalo",

    randomizer__randomize_pitch: "Aleatoriza el pitch de las notas MIDI con restricciones",
    randomizer__randomize_velocity: "Aleatoriza las velocities de las notas MIDI",
    randomizer__randomize_timing: "Aleatoriza el timing/posición de las notas MIDI",
    randomizer__randomize_duration: "Aleatoriza la duración de las notas MIDI",
    randomizer__randomize_all: "Aleatoriza pitch, velocity, timing y duración a la vez",

    sections__get_sections: "Lista las secciones reales de arreglo a partir de los cue points de Live",
    sections__create_section: "Crea un cue point real marcando el inicio de una sección (color/duración/tempo no los guardan los marcadores de Live — solo advisory)",
    sections__duplicate_section: "Duplica el/los marcador(es) de una sección más adelante en el arreglo (advisory — los clips entre marcadores NO se copian, solo el marcador)",
    sections__delete_section: "Borra el cue point real de una sección (borrar en cascada el contenido de los clips no está soportado por el SDK — advisory)",

    lyricmelody__analyze_lyrics: "Analiza la letra para generación de melodía",
    lyricmelody__generate_melody_from_lyrics: "Genera una melodía a partir de la letra",
    lyricmelody__suggest_harmony: "Genera una pista MIDI de armonía real a partir de las notas del clip existente de la pista de melodía",

    fxpresets__get_track_devices: "Lista los devices y parámetros reales de la pista (cadena FX)",
    fxpresets__save_fx_preset: "Guarda la cadena FX real y actual de la pista como preset con nombre (persiste en disco)",
    fxpresets__search_presets: "Busca en los presets de cadena FX guardados",
    fxpresets__apply_fx_preset: "Aplica un preset de cadena FX a una pista (inserta los devices del preset)",
    fxpresets__compare_tracks: "Compara cadenas FX reales entre dos pistas",

    timesig__get_time_signature: "Obtén info del compás actual",
    timesig__add_sig_change: "Añade un marcador de cambio de compás (advisory — Scene.signature no tiene setter, y el SDK no tiene el concepto de cambio de compás por posición de arreglo)",
    timesig__get_sig_map: "Obtén los compases reales por escena desde Live",
    timesig__apply_polyrhythm: "Crea capas de polirritmo con distintos compases",

    chordpads__get_chords: "Obtén los tipos de acorde disponibles",
    chordpads__set_pad: "Asigna un acorde a un pad (persiste en disco)",
    chordpads__trigger_pad: "Coloca el acorde del pad como clip MIDI en una pista nueva",
    chordpads__set_layout: "Ajusta el tamaño de la rejilla de pads (persiste en disco — es la rejilla de UI propia de la extensión, no un ajuste de Live)",
    chordpads__set_fixed_velocity: "Activa velocity fija para los pads de acorde (persiste en disco; se aplica la próxima vez que se dispare un pad)",

    health__run_checks: "Escanea el proyecto en busca de problemas reales: samples faltantes, pistas/escenas vacías, nombres duplicados, audio largo sin warp",
    health__apply_fix: "Aplica una corrección devuelta por run_checks (renombrar/borrar vacías/warp)",
    health__get_report: "Resumen de salud en una sola llamada (puntuación + conteo de problemas)",

    notation__get_clip_notes: "Obtén todas las notas MIDI de un clip como datos de notación",
    notation__get_score: "Obtén la partitura como datos estructurados, agrupados en compases reales (4 tiempos cada uno) a partir de las notas reales del clip",
    notation__transpose_score: "Transpón las notas MIDI reales del clip N semitonos (deshacible)",

    drumreplace__replace_drum: "Extrae los tiempos de golpe reales de un tipo de batería de un clip existente a una pista MIDI nueva (advisory — el reemplazo real de sample/audio no es posible vía el SDK; apunta un instrumento distinto a la pista nueva)",
    drumreplace__get_kits: "Lista los kits de reemplazo de batería disponibles",
    drumreplace__create_layer: "Copia los tiempos de golpe reales de un tipo de batería a una pista MIDI nueva para superponerla bajo la original (advisory — mezclar ambas de forma audible necesita un sample real en la pista nueva)",

    genarranger__generate_arrangement: "Genera un plan de arreglo real (nombres de sección/compases/energía) que respeta estilo/secciones/curva de energía — apply_arrangement luego coloca ESTE plan en la timeline",
    genarranger__apply_arrangement: "Coloca el último arreglo generado (o la plantilla por defecto, si no se generó ninguno) en la timeline como locators de sección con nombre (cue points)",
    genarranger__create_variation: "Muta los clips MIDI reales dentro de una sección con nombre (localizada por su rango de cue points) — strip/dense/rhythmic/melodic (deshacible)",
    genarranger__set_energy_curve: "Redibuja la curva de energía del arreglo (advisory — el SDK no tiene API de escritura de automatización de arreglo para dibujar una envolvente de volumen en el tiempo)",

    setlist__create_setlist: "Crea un nuevo setlist para directo (persiste en disco)",
    setlist__add_song: "Añade una canción/plantilla a un setlist guardado (persiste en disco)",
    setlist__reorder_setlist: "Reordena las canciones de un setlist guardado (persiste en disco)",
    setlist__list_setlists: "Lista los setlists guardados, incluyendo la lista real de canciones de cada uno",
    setlist__delete_setlist: "Borra un setlist guardado",
    setlist__get_current_session: "Captura el estado real de la sesión actual de Live (pistas, tempo, compás) como candidato a entrada de setlist",

    grouprouting__list_groups: "Lista todas las pistas de grupo y sus miembros (real — lee Track.groupTrack)",
    grouprouting__create_group: "Crea una pista bus como sustituto de una pista de grupo (advisory — el SDK no tiene createGroupTrack/setter de groupTrack, así que las pistas listadas NO quedan realmente anidadas bajo ella)",
    grouprouting__add_to_group: "Añade pista(s) a un grupo existente (advisory — el SDK no tiene API para re-anidar una pista bajo un grupo)",
    grouprouting__set_group_routing: "Ajusta opciones de ruteo de la pista de grupo (advisory — el ruteo de audio/selector de salida no está expuesto por el SDK; volumen/mute SÍ son reales vía track.mixer/track.mute)",
    grouprouting__ungroup: "Desagrupa pistas, elimina la pista de grupo (advisory — el SDK no tiene semántica de desagrupar/borrar-pistas-de-grupo más allá de deleteTrack, ni forma de verificar el re-anidado de miembros)",

    trackmanager__list_tracks: "Lista todas las pistas con su estado real (nombre, mute/solo/arm, volumen, tipo)",
    trackmanager__bulk_action: "Aplica mute/solo/arm a varias pistas a la vez (deshacible)",
    trackmanager__color_tracks: "Ajusta el color para varias pistas (advisory — el SDK no tiene Track.color; solo los clips son coloreables, ver Color Theory Palette)",
    trackmanager__set_volume: "Ajusta el fader (en dB) de varias pistas a la vez (deshacible)",
    trackmanager__duplicate_tracks: "Duplica pistas de verdad (song.duplicateTrack); opcionalmente vacía los clips de las copias",

    temposync__get_tempo_info: "Obtén el tempo actual e info de la rejilla",
    temposync__set_tempo: "Ajusta el tempo maestro",

    mixscene__save_scene: "Guarda el estado actual del mezclador como escena (persiste en disco)",
    mixscene__recall_scene: "Recupera una escena de mezcla guardada, escribiendo volumen/pan/mute/solo/sends de vuelta en las pistas reales (deshacible)",
    mixscene__list_scenes: "Lista las escenas de mezcla guardadas",
    mixscene__delete_scene: "Borra una escena guardada",
    mixscene__compare_scenes: "Compara dos escenas de mezcla guardadas en cada pista/parámetro capturado",

    console__execute_command: "Ejecuta un comando de consola seguro que actúa de verdad sobre el Set (tempo, pistas, crear, renombrar, marcador)",
    console__list_api: "Referencia de objetos/métodos comunes de la API de Live",
    console__run_script: "Ejecuta un script multilínea contra el Set en vivo (song, console en scope)",
    console__save_script: "Guarda un script en el almacenamiento del Set (persiste entre sesiones)",
    console__list_saved_scripts: "Lista los scripts guardados en el almacenamiento del Set",
    console__run_saved_script: "Carga un script guardado por id y ejecútalo contra el Set",
    console__delete_saved_script: "Borra un script guardado por id",

    clipversions__save_version: "Guarda las notas/duración REALES y actuales del clip como una versión",
    clipversions__list_versions: "Lista todas las versiones guardadas de un clip",
    clipversions__restore_version: "Restaura de verdad las notas de una versión guardada sobre el clip (deshacible)",
    clipversions__diff_versions: "Compara dos versiones guardadas de un clip (comparación real nota a nota)",
    clipversions__auto_snapshot: "Preferencia de auto-versionado (advisory — la extensión no tiene un scheduler en segundo plano para ejecutar esto periódicamente; llama tú mismo a save_version con la cadencia que quieras)",

    drummap__get_drum_rack: "Obtén info del drum rack de una pista",
    drummap__set_drum_mapping: "Reafina la nota MIDI real de un pad de batería (DrumChain.receivingNote — deshacible); nombre/color son advisory porque Chain no tiene ninguna de esas propiedades",
    drummap__set_output_routing: "Rutea un pad de batería a un canal de salida específico (advisory — ChainMixer no expone ninguna propiedad de ruteo de salida en el SDK)",
    drummap__load_drum_map_preset: "Carga un preset estándar de drum map (advisory — el SDK no tiene API para cargar un archivo de preset de drum rack)",

    midigate__set_midi_gate: "Configura el efecto de gate MIDI en una pista de audio",
    midigate__generate_gate_pattern: "Escribe un clip REAL de patrón de gate MIDI (distribución euclidiana determinista por densidad, con swing y acentos) en una pista — deshacible",
    midigate__set_gate_pattern: "Escribe un patrón de gate desde una cadena binaria (1/x = on, 0/./- = off) como clip MIDI REAL — deshacible",

    macros__create_macro_map: "Mapea un parámetro a una macro con curva/rango (advisory — el SDK no tiene API de mapeo MIDI; ajusta el valor de la macro directamente con set_macro)",
    macros__set_macro: "Ajusta la macro de un rack a un valor real (deshacible)",
    macros__save_macro_preset: "Guarda los valores reales y actuales de macro del rack como preset (persiste en disco)",
    macros__batch_map: "Mapea varios parámetros a macros a la vez (advisory — el SDK no tiene API de mapeo MIDI)",
    macros__list_macro_presets: "Lista los presets de macro guardados",

    stepseq__set_pattern: "Ajusta el patrón del secuenciador de pasos",
    stepseq__toggle_step: "Activa/desactiva un solo paso en la rejilla de un clip",
    stepseq__set_step_param: "Ajusta velocity/accent/flam/prob de un paso editando la nota real (deshacible)",
    stepseq__chain_patterns: "Encadena letras de patrón con nombre en una estructura de canción (advisory — el SDK no tiene el concepto de banco de patrones; arregla clips reales en Arrangement en su lugar, ver Session → Arrangement)",
    stepseq__randomize_pattern: "Aleatoriza de verdad el patrón de pasos de un clip, mutando las notas existentes hacia una densidad objetivo (deshacible)",

    drumbus__set_bus_compressor: "Inserta/encuentra un Compressor en cada pista listada y ajusta sus parámetros reales (deshacible)",
    drumbus__add_drum_group: "Crea una pista bus como sustituto de un grupo de batería (advisory — el SDK no tiene createGroupTrack/setter de groupTrack, así que los miembros no quedan realmente anidados bajo ella)",
    drumbus__set_parallel_comp: "Ajusta la mezcla de compresión paralela en el bus de batería (advisory — el SDK no expone API de send/ruteo para construir un bus de compresión paralela)",
    drumbus__analyze_drum_bus: "Analiza frecuencia y dinámica del bus de batería (advisory — el SDK no puede leer un buffer de audio de una pista existente, solo de clips que esta extensión renderiza ella misma)",

    mixconsole__get_mixer_state: "Obtén el estado completo del mezclador para todas las pistas",
    mixconsole__set_fader: "Ajusta el nivel del fader de una pista",
    mixconsole__set_pan: "Ajusta la posición de pan de una pista",
    mixconsole__set_send: "Ajusta el nivel de send de una pista",
    mixconsole__toggle_mute: "Activa/desactiva el mute de una pista",
    mixconsole__toggle_solo: "Activa/desactiva el solo de una pista",

    trackcolor__get_tracks: "Lista todas las pistas con el color real de su primer clip (la pista en sí no tiene propiedad de color)",
    trackcolor__apply_color_scheme: "Colorea los clips de cada pista con un color de esquema por pista (escritura real de clip.color, deshacible)",
    trackcolor__set_track_color: "Colorea los clips reales de una sola pista (undo con recordColor)",
    trackcolor__export_color_map: "Exporta el color real del primer clip de cada pista como un mapeo",

    rackbuilder__create_rack: "Crea un rack de Instrumento/Efecto nuevo en una pista",
    rackbuilder__add_chain: "Especificación de chain para un rack (advisory — el SDK no puede añadir chains/zonas a un rack)",
    rackbuilder__configure_macro: "Especificación de macro para un rack (advisory — las macros de rack son DeviceParameters; mapéalas con el Macro Mapper / Safe Randomizer)",
    rackbuilder__get_rack_structure: "Obtén la estructura completa de un rack",

    miditransform__transpose_indexed: "Transpone solo las notas impares/pares/cada-N de un clip (por orden temporal) N semitonos — escritura real de notas, deshacible",
    miditransform__transpose: "Transpón notas MIDI en semitonos",
    miditransform__quantize: "Cuantiza notas MIDI a la rejilla",
    miditransform__humanize: "Añade variación aleatoria a las notas MIDI",
    miditransform__reverse: "Invierte las notas MIDI del clip en el tiempo (espejo)",
    miditransform__invert: "Invierte los pitches de las notas MIDI alrededor de un centro",
    miditransform__apply_arpeggio: "Convierte los pitches del clip en un patrón de arpegio",
    miditransform__generate_arp: "Genera un arpegio a partir de un acorde (raíz + tipo) en clips nuevos, con modos, rate, octavas, gate y N variaciones musicales",

    midilfo__set_lfo_target: "Ajusta el parámetro destino del LFO MIDI",
    midilfo__set_lfo_shape: "Ajusta la forma de onda del LFO",
    midilfo__set_lfo_bipolar: "Ajusta la salida del LFO como bipolar o unipolar",
    midilfo__toggle_lfo: "Activa/desactiva el LFO",
    midilfo__set_lfo_multi_target: "Ajusta el LFO para modular varios destinos",

    launchquant__get_global_quant: "Obtén la cuantización real de la rejilla global de arreglo de Live",
    launchquant__set_global_quant: "Ajusta la cuantización de lanzamiento global (advisory — Song.gridQuantization no tiene setter en el SDK; cámbiala desde el propio menú de cuantización de Live)",
    launchquant__set_clip_quant: "Ajusta la cuantización de lanzamiento de un clip específico (advisory — Clip no tiene propiedad de cuantización de lanzamiento en el SDK)",
    launchquant__get_clip_launch_modes: "Lista los clips reales de una pista (modo de lanzamiento/follow-action/cuantización no están expuestos por el SDK)",
    launchquant__set_scene_quant: "Ajusta la cuantización de lanzamiento de una escena (advisory — Scene no tiene propiedad de cuantización de lanzamiento en el SDK)",

    sandbox__eval_typescript: "Evalúa código TypeScript en el sandbox",
    sandbox__get_api_autocomplete: "Obtén sugerencias de autocompletado de la API del SDK",
    sandbox__list_safe_globals: "Lista los globals seguros disponibles en el sandbox",

    clipgraph__build_graph: "Construye el grafo de relaciones entre clips",
    clipgraph__find_related: "Encuentra clips relacionados con un clip origen",
    clipgraph__suggest_arrangement: "Sugiere una secuencia real de clips recorriendo el grafo real de relaciones misma-pista/mismo-color a partir de un clip semilla",

    tempotap__tap: "Registra un tap; calcula el BPM a partir de intervalos reales y ajusta el tempo",
    tempotap__set_from_taps: "Ajusta el tempo del proyecto a partir de los taps registrados",
    tempotap__tap_history: "Obtén el historial reciente de taps",
    tempotap__tap_reset: "Reinicia el historial de taps",

    resonance__analyze_wav: "Ejecuta análisis FFT sobre un archivo WAV renderizado: 30 bandas logarítmicas, frecuencia dominante y loudness",
    resonance__how_to_listen: "Explica cómo ejecutar el pipeline Listen de Resonance (renderizar un stem y luego analizarlo)",
    resonance__mask_matrix: "Renderiza cada pista de audio (o un subconjunto), analízalas con FFT, y encuentra bandas de frecuencia donde 2+ pistas se enmascaran entre sí — con sugerencias concretas de recorte de EQ.",

    autogain__fader_for_target: "Calcula el movimiento de fader (dB + valor 0-1) para llevar un nivel de fuente medido a un objetivo",
    autogain__gain_reference_info: "Cómo funciona el gain-staging automático y los niveles de referencia disponibles",
    autogain__run: "Renderiza cada pista de audio pre-fx, mide RMS/peak real, y calcula (opcionalmente aplica) el movimiento de fader necesario para llevar cada pista a un nivel de referencia común.",

    keyscale__detect_key: "Detecta la tonalidad/escala más probable del set (o de una pista) vía un histograma de clases de altura y perfiles tonales de Krumhansl–Schmuckler",
    keyscale__find_foreign_notes: "Lista las notas que caen fuera de una tonalidad/escala dada (o detectada)",
    keyscale__conform_to_scale: "Reescribe las notas fuera de escala al pitch en escala más cercano (Force to Key). Usa la escala de Live por defecto, si no, la tonalidad detectada.",
    keyscale__project_heatmap: "Tonalidad por pista + cuánto de cada pista encaja en la tonalidad global del proyecto (para un heatmap)",

    genrhythm__generate: "Genera un patrón de batería generativo usando probabilidad nativa de nota + desviación de velocity, con auto-fills opcionales",
    genrhythm__add_fill: "Coloca un fill de batería (roll + crescendo) en los últimos tiempos de un clip existente",
    genrhythm__reshuffle: "Vuelve a tirar el patrón de un clip generado (mismo estilo/densidad) sobre el mismo clip, con undo",
    genrhythm__undo: "Deshace el último reshuffle / add_fill de un clip (delega en el Historial de Ediciones compartido)",
    genrhythm__how_it_works: "Explica cómo el ritmo generativo usa probabilidad nativa de nota, fills y undo",

    texturemap__hz_to_pitch: "Convierte una frecuencia en Hz al pitch MIDI y nombre de nota más cercanos",
    texturemap__how_to_map: "Cómo el Audio Texture Mapper convierte audio en MIDI",

    spectrumcompare__how_to_compare: "Cómo Spectrum Match compara el contenido de frecuencia de dos pistas",

    projectsnapshot__how_snapshots_work: "Cómo Project Snapshot versiona un Live Set (guardar / comparar / restaurar)",
    projectsnapshot__save: "Serializa todo el Live Set en disco como un snapshot con nombre (tempo, escala, escenas, cue points, mezclador/devices/clips/notas de cada pista).",
    projectsnapshot__list: "Lista los snapshots de proyecto guardados",
    projectsnapshot__diff: "Compara dos snapshots guardados (líneas +/-/~ estilo git)",
    projectsnapshot__diff_current: "Compara un snapshot guardado contra el estado ACTUAL en vivo del Set — \"¿qué cambió desde este checkpoint?\" — sin guardar un snapshot nuevo antes.",
    projectsnapshot__restore: "Restaura un snapshot guardado sobre el Set en vivo (tempo, nombres/mute/solo/mezclador de pistas, notas de clip, nombres de escena, y cualquier cue point faltante). Cada cambio se registra en el Historial de Ediciones y se puede deshacer.",
    projectsnapshot__delete: "Borra un snapshot guardado",

    scoreeditor__get_score_data: "Obtén las notas + compás + tempo de un clip para renderizar la partitura",
    scoreeditor__to_musicxml: "Exporta un clip a MusicXML (ábrelo en MuseScore/Sibelius/Dorico para grabarlo + PDF)",
    scoreeditor__from_musicxml: "Importa MusicXML a un clip MIDI nuevo",

    clipvariations__list_transforms: "Lista las transformaciones de variación disponibles",
    clipvariations__generate_variations: "Genera N variaciones algorítmicas de un clip MIDI como clips nuevos",

    stemalign__how_alignment_works: "Cómo el Stem Aligner encuentra y aplica el desfase entre dos pistas de audio",

    samplebrain__how_sample_brain_works: "Cómo el Sample Library Brain indexa y busca tus samples",

    macromorph__how_morph_works: "Cómo Macro Snapshot Morph captura y hace morph entre estados de parámetros de un device",

    loopdetect__how_loop_detect_works: "Cómo el Loop Length Detective estima el BPM y sugiere un tempo global",

    warpcompare__how_warp_compare_works: "Cómo funciona el Warp Mode A/B Comparator",

    paramdiff__diff_devices: "Compara el mismo device entre varias pistas y marca valores de parámetro atípicos",
    paramdiff__normalize_param: "Ajusta un parámetro a la media del grupo entre las pistas dadas (corrige un valor atípico)",

    phrasefinder__find_phrase: "Busca en los clips MIDI del Set un patrón melódico (intervalos como '0,7,12,7' o nombres de nota como 'C2,G2,C3')",
    phrasefinder__highlight_match: "Colorea un clip para resaltar una frase encontrada (Live no puede navegar hasta ella, pero sí recolorearla)",

    saferandom__list_synth_sections: "Lee los parámetros REALES de un device y los agrupa en secciones semánticas (osc/filtro/env/lfo/fx/mix) — conoce los synths nativos de Ableton, con fallback genérico para lo demás",
    saferandom__randomize_sections: "Aleatoriza SOLO las secciones semánticas elegidas de un device (osc/filtro/env/lfo/fx/mix), cada parámetro empujado ±cantidad%% de su rango desde su valor ACTUAL — con semilla (reproducible), parámetros cuantizados omitidos, cada cambio deshacible",
    saferandom__how_safe_random_works: "Cómo el Safe Randomizer explora los parámetros de un device sin romper el sonido",

    groovetemplate__extract_template: "Extrae una plantilla de groove de micro-timing a partir del timing de notas de un clip",
    groovetemplate__apply_template: "Cuantiza un clip objetivo a la rejilla y añade el groove de un clip origen (micro-timing + velocity opcional). Los pitches excluidos mantienen su timing humano original (fuera del pocket).",
    groovetemplate__set_lane_dynamics: "Ajusta un rango dinámico independiente por elemento de batería (pitch): centra la velocity y escribe velocityDeviation nativo para que Live varíe cada lane por su cuenta.",

    probabilitylab__list_treatments: "Lista los tratamientos de probabilidad",
    probabilitylab__generate: "Genera variaciones usando probabilidad nativa de nota / releaseVelocity / velocityDeviation, como clips nuevos",

    velocompress__analyze: "Histograma de velocity + estadísticas de un clip MIDI",
    velocompress__compress: "Comprime hacia abajo las velocities de nota por encima de un umbral (ratio + makeup), escrito en el propio clip",

    transposer__suggest: "Clasifica las 25 transposiciones (-12..+12) según cuántas notas caen en [low,high]",
    transposer__apply: "Transpón las notas de un clip N semitonos (in place), acotado a 0..127",
    transposer__transpose_all: "Transpón TODOS los clips MIDI del Set N semitonos (session + arrangement), deshacible vía Historial de Ediciones",

    colortheory__palette: "Genera una paleta de teoría del color a partir de un hex base",
    colortheory__apply_to_track: "Colorea los clips de una pista con una paleta generada (escritura real de clip.color)",

    takeorganizer__list: "Lista los take lanes de una pista con sus clips/contenido",
    takeorganizer__autolabel: "Auto-nombra los take lanes según su contenido (registro + densidad) o por índice",

    audio2midi__how_audio_to_midi_works: "Cómo Audio → MIDI Melody transcribe una parte monofónica a un clip MIDI",

    history__undo_last: "Deshace la edición destructiva más reciente de CUALQUIER módulo (global)",
    history__undo_target: "Deshace la última edición en un clip/pista/device específico",
    history__redo_last: "Rehace la edición deshecha más recientemente (global) — la vuelve a aplicar de verdad, no es solo deshacer el undo",
    history__redo_target: "Rehace la última edición deshecha en un clip/pista/device específico",
    history__list: "Lista las ediciones destructivas recientes (más reciente primero)",
    history__list_redo: "Lista las ediciones disponibles para rehacer (deshecha más recientemente primero)",
    history__clear: "Vacía el historial de ediciones (todo, o un objetivo concreto)",

    bassengine__generate: "Genera una línea de bajo (saltos de octava, ghost hits, sub-hold) en una pista nueva o existente",
    bassengine__mutate: "Muta un clip de bajo existente (inversiones de octava, toggles de ghost, desplazamientos de accent) manteniendo su contorno — deshacible vía Historial de Ediciones",

    sessionbridge__flatten_scene: "Copia los clips de Session de UNA escena al Arrangement en el beat elegido (por defecto: después del último clip del arreglo) — notas MIDI + audio desde archivo",
    sessionbridge__preview: "Previsualiza el layout Session→Arrangement: conteo de clips por escena y dónde caería cada una",
    sessionbridge__flatten: "Copia cada clip de Session a la timeline de Arrangement, escena por escena (MIDI + audio)",

    patternlang__examples: "Patrones de ejemplo para la mini-notación",
    patternlang__compile: "Compila un patrón de mini-notación en un clip MIDI",

    timestretch__how_time_stretch_works: "Cómo Time-Stretch procesa el audio de un clip",

    drumsynth__how_drum_synth_works: "Cómo Drum Synth crea kicks, snares, claps y hats",

    slicelab__how_slice_lab_works: "Cómo Slice Lab muta un clip de audio en un loop nuevo",

    mosaic__how_mosaic_works: "Cómo Mosaic genera variaciones de loop a partir de un clip",

    riser__how_riser_works: "Cómo Riser construye sweeps y transiciones",

    sub808__how_808_works: "Cómo el 808 Engine sintetiza un sub afinado",

    padengine__how_pad_works: "Cómo el Pad Engine sintetiza pads evolutivos",

    pluckengine__how_pluck_works: "Cómo el Pluck Engine sintetiza cuerdas pulsadas",

    acid303__how_acid_works: "Cómo el Acid Engine crea una línea estilo 303",

    chordstab__how_it_works: "Cómo funciona el motor Chord Stab",

    fmbell__how_it_works: "Cómo funciona el motor FM Bell",

    impact__how_it_works: "Cómo funciona el motor Impact",

    subbass__how_it_works: "Cómo funciona el motor Sub Bass",

    organ__how_it_works: "Cómo funciona el motor Organ",

    vocalchop__how_it_works: "Cómo funciona el motor Vocal Chop",

    instrumentrender__how_it_works: "Cómo Instrument Render reproduce un clip MIDI a través de un motor",

    brass__how_it_works: "Cómo funciona el motor Brass",

    wobble__how_it_works: "Cómo funciona el motor Wobble Bass",

    choir__how_it_works: "Cómo funciona el motor Choir",

    subdrop__how_it_works: "Cómo funciona el motor Sub Drop",

    pluckbass__how_it_works: "Cómo funciona el motor Pluck Bass",

    sawlead__how_it_works: "Cómo funciona el motor Saw Lead",

    reese__how_it_works: "Cómo funciona el motor Reese Bass",

    marimba__how_it_works: "Cómo funciona el motor Marimba",

    glitch__how_it_works: "Cómo funciona el motor Glitch FX",

    tapehiss__how_it_works: "Cómo funciona el motor Tape Hiss",

    trumpet__how_it_works: "Cómo funciona el motor Trumpet",

    epiano__how_it_works: "Cómo funciona el motor E-Piano",

    musicbox__how_it_works: "Cómo funciona el motor Music Box",

    harp__how_it_works: "Cómo funciona el motor Plucked Harp",

    whistle__how_it_works: "Cómo funciona el motor Whistle",

    subwobble__how_it_works: "Cómo funciona el motor Sub Wobble",

    vocoder__how_it_works: "Cómo funciona el motor Vocoder / Talkbox",

    noisefx__how_it_works: "Cómo funciona el motor Noise FX",

    cymbal__how_it_works: "Cómo funciona el motor Cymbal",

    guitar__how_it_works: "Cómo funciona el motor Distorted Guitar",

    sitar__how_it_works: "Cómo funciona el motor Sitar",

    steeldrum__how_it_works: "Cómo funciona el motor Steel Drum",

    accordion__how_it_works: "Cómo funciona el motor Accordion",

    theremin__how_it_works: "Cómo funciona el motor Theremin",

    hihat808__how_it_works: "Cómo funciona el motor 808 Hi-Hat",

    stabhit__how_it_works: "Cómo funciona el motor Stab Brass Hit",

    glassbell__how_it_works: "Cómo funciona el motor Glass Bell",

    subkick__how_it_works: "Cómo funciona el motor Sub Kick",

    reversesweep__how_it_works: "Cómo funciona el motor Reverse-Sweep",

    devremote__list_devices: "Lista cada device de una pista (nombre, índice, conteo de parámetros) — incluye Max for Live y devices de terceros ya presentes en la pista",
    devremote__get_params: "Lista cada parámetro de un device con su valor actual, rango y opciones — funciona en cualquier device, nativo o Max for Live",
    devremote__set_param: "Ajusta un parámetro de device directamente por índice o nombre (deshacible vía Historial de Ediciones)",
    devremote__reset_param: "Restablece un parámetro a su valor por defecto (deshacible)",
    devremote__save_snapshot: "Guarda el estado completo y actual de parámetros de un device (p. ej. un instrumento Max for Live) en almacenamiento",
    devremote__list_snapshots: "Lista los snapshots de device guardados",
    devremote__load_snapshot: "Restaura los valores de parámetro de un snapshot guardado sobre el device (aún presente)",
    devremote__delete_snapshot: "Borra un snapshot guardado",
    devremote__compare_snapshots: "Compara dos snapshots de device guardados parámetro a parámetro",
    devremote__sweep_param: "Barre un parámetro de device de un valor a otro a lo largo de tiempo real (deshacible — restaura el valor previo al barrido). Útil para barridos de filtro/risers/builds sin la UI de automatización de Live.",

    stemexport__export_sections: "Renderiza pistas en lote por SECCIÓN del arreglo (cue point → siguiente cue point) a WAVs reales con metadata INFO embebida (nombre de sección, tempo)",
    stemexport__list_export_candidates: "Lista qué pistas exportarían de verdad (pistas de audio — las pistas MIDI necesitan resamplearse a audio primero)",
    stemexport__how_it_works: "Cómo Stem Export renderiza y nombra los archivos",
    stemexport__export: "Renderiza en lote cada pista de audio (o un subconjunto) a un archivo WAV real en disco con nombrado automático. Las pistas MIDI se omiten (resampléalas a audio primero).",

    mixcoach__how_it_works: "Cómo Mix Coach prioriza los próximos pasos",
    mixcoach__analyze: "Ejecuta el análisis de salud/masking/gain-staging en conjunto y devuelve una única lista priorizada de próximos pasos, cada uno con la tool+args exactos para actuar.",

    stripsilence__how_it_works: "Cómo Strip Silence mapea y recorta el silencio real de un clip",
    stripsilence__analyze_silence: "Mapea las regiones de silencio reales de un clip (inicio/cola/huecos) desde su envolvente RMS medida",
    stripsilence__trim_silence: "Recorta el silencio real de inicio/cola de un clip (o divídelo en segmentos por sonido) en archivo(s) nuevos, importados al proyecto",
    transients__how_it_works: "Cómo funcionan el detector de transientes, el troceador y el cuantizador de audio sin Warp",
    transients__detect_transients: "Detecta los transientes reales de un clip (tiempos de ataque + fuerzas) desde su audio",
    transients__slice_at_transients: "Trocea el audio de un clip en sus transientes reales en archivos por golpe, importados al proyecto",
    transients__quantize_audio: "Cuantización de audio sin Warp: corta en los transientes reales y desplaza cada segmento a la rejilla del tempo, reconstruido en un archivo nuevo con crossfades",
    clipeditor__how_it_works: "Cómo funciona el editor de regiones de clip a nivel de sample",
    clipeditor__edit_region: "Edición a nivel de sample de una región del audio real de un clip — recorta a ella, silénciala, dale ganancia o hazle fade — escrita a un archivo nuevo e importada",
    audioconvert__how_it_works: "Cómo funcionan la conversión de audio y la normalización RMS dentro de Live",
    audioconvert__convert_clip: "Convierte el audio real de un clip (sample rate vía resampleo real, ganancia) a un WAV nuevo de 16 bits, importado al proyecto",
    audioconvert__normalize_rms: "Normaliza por RMS el audio real de un clip a una sonoridad objetivo con techo seguro de picos, escrito a un archivo nuevo e importado",
    extremestretch__how_it_works: "Cómo funciona el freeze-stretch granular extremo",
    extremestretch__stretch: "Estiramiento granular extremo (2-200x, sin cambio de pitch) del audio real de un clip — nuestro propio motor de granos — escrito a un archivo nuevo e importado",
    reverseverb__how_it_works: "Cómo se construye el swell de reverb invertida desde tu clip",
    reverseverb__apply: "Swell clásico de reverb invertida desde el audio real de un clip: reverbera el clip invertido, vuélvelo a voltear, y llévalo hacia el original — archivo nuevo, importado",
    iterate__how_it_works: "Cómo la iteración desintegrativa degrada un sonido pasada a pasada",
    iterate__disintegrate: "Pasa el audio real de un clip por una cadena de degradación N veces (lofi / saturación / smear / oscurecer) — cada pasada alimenta la siguiente; archivos final (y de hito opcionales) importados",
    retime__rescale_clip: "Reescala el timing de las notas de un clip MIDI entre interpretaciones de tempo — half-time, double-time, o from_bpm→to_bpm — reescribiendo de verdad startTime/duration (deshacible)",
    linkedclips__link_clips: "Crea un grupo persistente de clips vinculados (refs como \"t0_c1,t2_c0\") — sync_group luego propaga las notas de un miembro al resto",
    linkedclips__sync_group: "Propaga las notas REALES del miembro origen a cada otro clip MIDI del grupo (deshacible por clip); los miembros de audio se reportan como no sincronizables",
    linkedclips__list_groups: "Lista los grupos de clips vinculados guardados",
    linkedclips__unlink_group: "Borra un grupo de vínculos (los clips en sí quedan intactos)",
    drumextract__extract_active_pads: "Divide los pads ACTIVOS de un Drum Rack (notas que realmente ocurren en el clip) en pistas MIDI nuevas separadas — una pista + clip por pad",
    cuesheet__generate_cue_sheet: "Genera un cue sheet de mixtape (.cue y/o .txt) desde los cue points REALES del Set — tiempos calculados desde beats al tempo actual, archivos escritos en almacenamiento",
    imagemidi__grid_to_notes: "Escribe una rejilla de luminancia (filas de niveles 0-9 separadas por '/' — el panel Image→MIDI la construye desde cualquier imagen) como notas REALES en una pista MIDI nueva: filas = pitches (mapeados a escala), columnas = pasos de tiempo, nivel = velocity",
    quickactions__list_quick_actions: "Lista las acciones rápidas (cada una enruta a una tool real)",
    quickactions__run_quick_action: "Resuelve una acción rápida a la tool + args reales para ejecutar",
  };

  function td(kind, key, fallback) {
    const dict = kind === "module" ? MODULES : TOOLS;
    return dict[key] != null ? dict[key] : (fallback != null ? fallback : key);
  }

  return { td, MODULES, TOOLS };
})();
