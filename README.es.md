<p align="center">
  <img src="assets/cover.png" alt="Live Studio — super-extensión para Ableton Live" width="100%" />
</p>

<h1 align="center">🎛️ Live Studio</h1>

<p align="center">
  <b>Una super-extensión modular para Ableton Live.</b><br/>
  144 módulos · 414 tools · 90 micro-acciones · copiloto IA · paleta <code>⌘K</code> — en un único webview por pestañas.
</p>

<p align="center">
  <a href="https://github.com/ramonsesma/live-studio/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ramonsesma/live-studio/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="modules" src="https://img.shields.io/badge/m%C3%B3dulos-132-ffb347" />
  <img alt="tools" src="https://img.shields.io/badge/tools-414-6cc6ff" />
  <img alt="quick actions" src="https://img.shields.io/badge/micro--acciones-83-5ad17a" />
  <img alt="rich panels" src="https://img.shields.io/badge/paneles%20ricos-115-9370db" />
  <img alt="tests" src="https://img.shields.io/badge/tests-292%20%E2%9C%93-2ea043" />
  <img alt="bundle" src="https://img.shields.io/badge/bundle-840%20KB-888" />
  <img alt="license" src="https://img.shields.io/badge/license-GPLv3-blue" />
  <a href="README.md"><img alt="readme in English" src="https://img.shields.io/badge/README-English-yellow" /></a>
</p>

---

## ¿Qué es?

**Live Studio** reúne decenas de extensiones de producción musical para Ableton Live en **una sola
extensión**. En lugar de instalar y cargar muchas extensiones —cada una con su propio servidor
peleando por el mismo puerto— Live Studio las **ensambla** bajo:

- **un único servidor local + un único webview** con barra lateral por pestañas,
- **carga perezosa** de cada panel (arranca ligero aunque tenga decenas de módulos),
- un **copiloto IA** que controla cualquier módulo por lenguaje natural,
- y una **paleta de comandos rápidos** (`⌘K` / `Ctrl+K`) que busca y ejecuta sobre todo.

## ✨ Características

- **144 módulos** (todos visibles) con **414 tools reales** repartidos por categorías:
  generación musical, drums, mezcla/mastering, EQ/análisis, síntesis, sampling, arreglo,
  performance/live, MIDI, hardware/control, gestión de proyectos, conversión audio↔MIDI y más.
- **Copiloto IA** (OpenRouter / OpenAI / Gemini / NVIDIA NIM / OpenCode Zen) con loop de *tool-calling*: descubre y
  ejecuta **cualquiera de los 414 tools** mediante un kit de meta-tools (`find_tools` busca en
  toda la suite, `list_modules` navega, `run_tool` ejecuta) — alcanza todo sin saturar al modelo.
- **Paleta de comandos rápidos** (`⌘K`): indexa los **414 tools** + **90 quick actions**
  (cada una un atajo que ejecuta un tool real con args) y las ejecuta con teclado.
- **116 paneles ricos** curados donde el formulario automático se queda corto: piano-roll,
  grafo de clips, mixer con faders/pan/sends, rejillas de pasos y pads, mapa de drums, comping, curva EQ,
  diseñador de LFO, trance gate, synth patchbay, timeline de arreglo, rejilla de pistas, gain
  staging, rack builder, salud de sesión, pad de directo, diff de versiones…
- **Dashboard + actualizaciones en vivo**: una vista de inicio con el proyecto de un vistazo
  (BPM, tonalidad, pistas, clips, escenas, snapshots) que se refresca sola — el servidor hace diff
  del Set cada 1,5 s y emite eventos SSE; paneles como el Mix Console se re-renderizan al cambiar el Set.
- **Favoritos, recientes y perfiles de trabajo**: fija módulos, vuelve a los recientes y filtra el
  sidebar por perfil (Mixing / Sound design / Performance) — persistido en el servidor.
- **Modo plan del copiloto**: "Plan first" hace que la IA proponga un plan revisable paso a paso
  (exploración de solo lectura, cero ejecución) que aplicas con un clic — cada paso deshacible
  vía Edit History.
- **Auto-documentado**: `npm run gen:catalog` regenera un catálogo estático y buscable de todos los
  módulos/tools (docs/) directamente desde el registry; `npm run new:module` genera un módulo
  completo (tools + panel + registro + tests) en un comando.
- **UI bilingüe (EN/ES)**: el shell detecta el idioma del sistema (con toggle manual) — un solo
  código compartido, sin archivos duplicados, vía un único diccionario (`public/i18n.js`).
  Las descripciones de las 414 tools también están traducidas (`public/desc-i18n.js`), visibles
  en el autoformulario, la paleta de comandos y las cabeceras de panel — el texto en inglés que
  lee el copiloto IA queda intacto.
- **Carga perezosa de paneles**: los paneles ricos (~670 KB en total) se cargan al abrir cada
  módulo por primera vez en vez de los 115 de golpe, así la UI aparece al instante.
- **UI auto-generada** para el resto: cualquier módulo nuevo aparece con su formulario sin escribir
  HTML, leyendo las definiciones de sus tools.
- **Ligero**: bundle de ~840 KB, sin frameworks de frontend.
- **Probado**: 292 pruebas de humo end-to-end del servidor + módulos.

## 📸 Vistas

> La UI se ejecuta dentro de Ableton Live (vía `ctx.ui.showModalDialog`). Algunas vistas:
>
> - **Módulos** — barra lateral + panel con formularios auto-generados por tool.
> - **Copiloto IA** — chat que encadena `session__create_midi_track` → `chords__generate_chords` → `drums__generate_pattern` en una sola instrucción.
> - **Paleta ⌘K** — buscador que mezcla tools reales y micro-acciones.
> - **Paneles ricos** — Mix Console (faders/pan/sends), Notation (piano-roll), Step Sequencer, grafo de clips…

*(Captura las pantallas reales desde Live y colócalas en `assets/` para enriquecer esta sección.)*

---

## ⭐ Destacado — Resonance · Mix Radar

<p align="center">
  <img src="assets/demo-mix-radar.gif" alt="Resonance Mix Radar — escucha, detecta colisiones de masking y las talla" width="100%" />
</p>

**La primera extensión de Live que renderiza tu set a audio, lo _escucha_ y produce de vuelta dentro de él.** Los plugins de un solo canal (Neutron, Gullfoss, smart:EQ) solo ven una pista — Resonance ve el **set completo**.

- **Listen** — renderiza cada stem de audio con `resources.renderPreFxAudio` y corre una **FFT real dentro del host** (cero dependencias nativas): 30 bandas log, frecuencia dominante y loudness por pista.
- **Ver el masking** — funde los espectros en una **matriz frecuencia × pista**; donde dos pistas pelean en la misma banda, la celda se pone roja.
- **Actuar** — convierte cada colisión en un **move** correctivo de un clic (tallar EQ, bajar, panear) escrito de vuelta con `DeviceParameter.setValue`, todo en un solo undo (`withinTransaction`).
- **Recordar** — cachea huellas espectrales por proyecto en `environment.storageDirectory`.

El Mix Radar es el más elaborado de los 115.

## 🚀 Instalación

> **Para *usarla* no necesitas el SDK, ni Node, ni programar.** Solo el archivo `.ablx`
> de abajo y Ableton Live 12.4.5b+.

### Opción A — descargar e instalar (para cualquiera)
1. Descarga **`live-studio.ablx`** desde la pestaña **[Releases](../../releases)**.
2. En Ableton Live abre **Preferences → Extensions** y **arrastra el `.ablx` a ese panel**
   (o usa su botón de instalar). Live confirma que quedó instalada.
3. **Asegúrate de que “Developer Mode” esté APAGADO** en esa misma pestaña. Con Developer
   Mode encendido, el host de extensiones lo controla el runner del SDK y una extensión
   *instalada* no arranca.
4. **Cierra y vuelve a abrir Ableton Live** (reinicio completo — hace falta para que el
   proceso host de la extensión arranque en el beta actual).
5. Abre la UI: **clic derecho en una pista, un clip slot vacío, un clip o una escena →
   Extensions → Live Studio.** Se abre la ventana; ciérrala con la ✕.

> Si "Live Studio" no aparece en el submenú **Extensions** del clic derecho, casi siempre es
> (a) Developer Mode quedó encendido, o (b) no reiniciaste Live tras instalar — ambos son
> comportamientos conocidos del beta de Live 12. Revisa esos dos y relanza Live.

### Opción B — compilar desde el código (para desarrolladores)
```bash
git clone <repo-url> live-studio && cd live-studio
npm install
npm run build        # esbuild → dist/extension.js + copia la UI a dist/ui
npm run package      # genera live-studio.ablx (incluye la UI)
npm run start        # extensions-cli run (dentro del Extension Host de Live)
```
Requisitos: **Node ≥ 22.11** y el **Ableton Extensions SDK** (beta).

## 🤖 Copiloto IA

En la pestaña **Copiloto IA** elige proveedor (OpenRouter / OpenAI / Gemini / NVIDIA NIM / OpenCode Zen), pega tu API key
y opcionalmente un modelo. Ejemplos de instrucciones:

> «crea una pista MIDI llamada Bajo y genera una progresión pop en C menor, luego un beat de techno a 124 BPM»

La clave se guarda solo en memoria del servidor local; nada se persiste en disco.

## 🧩 Arquitectura

Cada módulo expone el mismo contrato mínimo, así que **son fusionables sin adaptadores**:

```
ToolDefinition { name, description, category, parameters }
ToolResult     { success, data?, error? }
ToolRegistry   .register(def, handler)  .execute(name, args, song)
```

El `MasterRegistry` los **absorbe** delegando la ejecución y *namespaceando* nombre/categoría
(`drums__generate_pattern`). El shell sirve una API uniforme:

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/modules` | módulos para la barra lateral |
| GET | `/api/tools[?module=id]` | definiciones de tools |
| POST | `/api/execute` | `{name, args}` → ejecuta un tool |
| POST | `/api/chat` | copiloto IA (loop de tool-calling) |
| GET/POST | `/api/config` | proveedor / API key / modelo |

```
src/
├── extension.ts          # activate(): registry → bridge → server → showModalDialog
├── server.ts             # endpoints unificados, puerto dinámico, sirve la UI
├── bridge.ts             # executeTool() + processChat() (loop IA)
├── core/{registry,llm}.ts
├── registry/index.ts     # ← punto de ensamblaje (añadir módulo = 1 línea)
└── modules/<id>/tools.ts # cada módulo = su toolRegistry
public/
├── index.html · shell.js · styles.css   # shell + autoform + paleta
└── panels/<id>.js                        # 116 paneles ricos
```

### Añadir un módulo (3 pasos)
1. Copia el `toolRegistry` a `src/modules/<id>/tools.ts` (exporta `createToolRegistry()`).
2. Regístralo en `src/registry/index.ts`:
   ```ts
   m.addModule({ id:"reverb", label:"Reverb & Delay", icon:"🌫️", registry: reverbTools() });
   ```
3. `npm run build`. Aparece en la UI y para el copiloto. **Sin tocar HTML.**

### Paneles ricos
Crea `public/panels/<id>.js` que registre `window.LiveStudioPanels["<id>"] = (panel, helpers) => …`.
No hace falta tocar `index.html` — los paneles cargan perezosos: `shell.js` pide `/panels/<id>.js`
la primera vez que abres ese módulo (un 404 simplemente cae al autoform), así que nada se
descarga hasta que de verdad se usa. Ya hay 115, entre ellos:
`organizer`, `fxchain`, `mixconsole`, `stepseq`, `chordpads`, `drums`, `drummap`, `clipgraph` (grafo), `notation` (piano-roll), `takes`, `eq` (curva EQ), `midilfo` (diseñador LFO), `midigate` (trance gate), `synth` (patchbay), `genarranger` (timeline de arreglo), `trackmanager` (rejilla de pistas), `health` (salud de sesión), `mastering` (gain staging), `rackbuilder` (rack), `performance` (pad de directo), `clipversions` (versiones y snapshots), `resonance` (mix radar + matriz de masking), `autogain` (auto gain-staging), `keyscale` (key detection), `genrhythm` (generative rhythm), `texturemap` (audio→MIDI), `spectrumcompare` (spectrum match), `projectsnapshot` (git for Live Sets), `scoreeditor` (notation + MusicXML), `clipvariations` (variation engine), `stemalign` (stem aligner), `samplebrain` (sample library brain), `macromorph` (macro snapshot morph), `loopdetect` (loop BPM), `warpcompare` (warp A/B), `paramdiff` (outlier QA), `phrasefinder` (MIDI phrase search), `saferandom` (safe randomizer), `groovetemplate` (groove extractor), `probabilitylab` (probability lab), `devremote` (control remoto de cualquier device, incl. Max for Live), `stemexport` (exportación de stems en lote), `mixcoach` (próximos pasos de mezcla priorizados), `history` (línea de tiempo undo/redo), `templates` (kits de género de un clic), `mixscene` (A/B de mezcla), `tempotap` (tap tempo), `notes` (notas persistentes), `sandbox` (REPL de live-coding), `delaycalc` (tabla de tiempos de delay), `setlist` (setlist reordenable), `fxpresets` (cadenas FX guardadas), `groove` (extractor/humanizador de groove), `colorizer` (coloreado de clips por métrica), `vocal` (constructor de cadena vocal).

## 🛠️ Desarrollo

```bash
npm run build         # compila (esbuild)
npm run typecheck     # tsc --noEmit
npm run test          # 292 pruebas de humo (servidor + módulos, song simulado)
npm run package       # build + empaqueta .ablx con la UI
npm run new:module     # genera un módulo: tools.ts + panel rico + registro + entradas de test, en un comando
npm run gen:catalog    # regenera docs/catalog.html — catálogo estático y buscable de todos los módulos/tools
```

Para desarrolladores, `npm run new:module -- <id> "<Label>" [icon] ["descripción"]` crea
`src/modules/<id>/tools.ts` (una tool de ejemplo, con estado real del `song`), `public/panels/<id>.js`
(un panel rico con refresco en vivo ya conectado), registra el módulo en `src/registry/index.ts`,
y extiende `test/smoke.ts` para que la suite lo cubra de inmediato — sin ediciones manuales, sin
olvidar ningún paso.

## 📚 Catálogo de módulos

<details>
<summary><b>Ver los 144 módulos por categoría</b> (todos visibles — ninguno oculto)</summary>

- **Sesión & proyecto:** Sesión & Pistas · Clips & Escenas · Bulk Track Manager · Track Color Coordinator · Plantillas de Proyecto · Notas de Proyecto · Project Health · Organizador de Sesión · **Project Snapshot · Git** · Sample Library Brain · Param Diff & Outlier · MIDI Phrase Finder · Stem Export
- **MIDI & composición:** Acordes · Generador de Melodías · Letra → Melodía · MIDI Harmonizer · MIDI Randomizer · MIDI Transformer · MIDI Gate · MIDI LFO · Chord Pads · Step Sequencer · Quantize & Swing · Groove & Humanize · Notation Viewer · Generative Rhythm · Score Editor · Clip Variation Engine · Groove Template Extractor · Probability Lab
- **Drums:** Drums & Patterns · Drum Replacer · Drum Map Editor · Drum Bus Processor
- **Mezcla & FX:** EQ & Análisis · Compresión & Dinámica · Gain Staging · Mixing Assistant IA · Mix Console View · Mix Scene Saver · Cadenas de Efectos · FX Chain Presets · Macro Mapper Pro · Rack Builder · Macro Snapshot Morph · Safe Randomizer · **Resonance · Mix Radar** ⭐ · Auto-Gain Stager · Key & Scale Detective · Spectrum Match · Device Remote · Mix Coach
- **Arreglo & performance:** Arreglo & Navegación · Secciones de Arreglo · Generative Arranger · Performance & Looper · Takes & Comping · Clip Colorizer · Clip Versions · Clip Relation Graph · Clip Launch Quantizer · Setlist Manager
- **Tempo & tiempo:** Tempo & Grid Sync · Tempo Tapper · Time Signature · Delay Calculator · Loop Length Detective
- **Diseño de sonido:** Synth Patchbay · SFX & Texturas · Vocal Chain & FX · Audio Texture Mapper · Stem Aligner · Warp Mode A/B Comparator
- **Routing & dev:** Group Routing · API Console · Live Coding Sandbox · Edit History (línea de tiempo undo/redo) · Quick Actions (paleta ⌘K, 83 acciones)

> Los módulos que dependían de capacidades que el SDK de extensiones no expone (DSP/análisis
> de audio, transporte/grabación, hardware/controladores, acceso a archivos/librería, escaneo
> de plugins) se eliminaron, así que cada módulo aquí opera sobre el Set real.

</details>

## 🙏 Créditos

Construido sobre el **Ableton Extensions SDK**. Ensamblado a partir de extensiones propias,
consolidando lo mejor de cada concepto en una sola super-app.

## 📄 Licencia

[GNU GPL v3](LICENSE) © 2026 Ramón Sesma.

Software libre con copyleft fuerte: puedes usarlo, estudiarlo, modificarlo y compartirlo —
pero cualquier versión distribuida (incluidas las modificadas o comerciales) debe seguir
siendo abierta bajo la GPL; no se puede convertir en un producto cerrado y propietario.
