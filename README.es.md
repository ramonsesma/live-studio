<p align="center">
  <img src="assets/cover.svg" alt="Live Studio — super-extensión para Ableton Live" width="100%" />
</p>

<h1 align="center">🎛️ Live Studio</h1>

<p align="center">
  <b>Una super-extensión modular para Ableton Live.</b><br/>
  94 módulos · 409 tools · 1293 micro-acciones · copiloto IA · paleta <code>⌘K</code> — en un único webview por pestañas.
</p>

<p align="center">
  <a href="https://github.com/ramonsesma/live-studio/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ramonsesma/live-studio/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="modules" src="https://img.shields.io/badge/m%C3%B3dulos-94-ffb347" />
  <img alt="tools" src="https://img.shields.io/badge/tools-409-6cc6ff" />
  <img alt="quick actions" src="https://img.shields.io/badge/micro--acciones-1293-5ad17a" />
  <img alt="rich panels" src="https://img.shields.io/badge/paneles%20ricos-12-9370db" />
  <img alt="tests" src="https://img.shields.io/badge/tests-118%20%E2%9C%93-2ea043" />
  <img alt="bundle" src="https://img.shields.io/badge/bundle-468%20KB-888" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue" />
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

Nació de auditar **921 extensiones** propias (≈74.700 LOC) y consolidar lo mejor de cada concepto.

## ✨ Características

- **94 módulos** (93 visibles + 1 oculto) con **409 tools reales** repartidos por categorías:
  generación musical, drums, mezcla/mastering, EQ/análisis, síntesis, sampling, arreglo,
  performance/live, MIDI, hardware/control, gestión de proyectos, conversión audio↔MIDI y más.
- **Copiloto IA** (OpenRouter / OpenAI / OpenCode Zen) con loop de *tool-calling*: recibe las
  definiciones de los 409 tools y orquesta los módulos por lenguaje natural.
- **Paleta de comandos rápidos** (`⌘K`): indexa los **409 tools** + **1293 micro-acciones**
  (extraídas de 215 micro-extensiones) y las ejecuta con teclado.
- **12 paneles ricos** curados donde el formulario automático se queda corto: piano-roll,
  grafo de clips, matriz de modulación, mixer con faders/VU, rejillas de pasos y pads,
  mapa de drums, comping…
- **UI auto-generada** para el resto: cualquier módulo nuevo aparece con su formulario sin escribir
  HTML, leyendo las definiciones de sus tools.
- **Ligero**: bundle de ~468 KB, sin frameworks de frontend.
- **Probado**: 118 pruebas de humo end-to-end del servidor + módulos.

## 📸 Vistas

> La UI se ejecuta dentro de Ableton Live (vía `ctx.ui.showModalDialog`). Algunas vistas:
>
> - **Módulos** — barra lateral + panel con formularios auto-generados por tool.
> - **Copiloto IA** — chat que encadena `session__create_midi_track` → `chords__generate_chords` → `drums__generate_pattern` en una sola instrucción.
> - **Paleta ⌘K** — buscador que mezcla tools reales y micro-acciones.
> - **Paneles ricos** — Mix Console (faders/VU), Notation (piano-roll), rueda Camelot, grafo de clips…

*(Captura las pantallas reales desde Live y colócalas en `assets/` para enriquecer esta sección.)*

## 🚀 Instalación

### Opción A — descargar el paquete
1. Descarga `live-studio.ablx` desde la pestaña **[Releases](../../releases)**.
2. En Ableton Live: **Preferences → … → Install Extension** y selecciona el `.ablx`.
3. Abre Live Studio desde el menú de extensiones.

### Opción B — compilar desde el código
```bash
git clone <repo-url> live-studio && cd live-studio
npm install
npm run build        # esbuild → dist/extension.js + copia la UI a dist/ui
npm run package      # genera live-studio.ablx (incluye la UI)
npm run start        # extensions-cli run (dentro del Extension Host de Live)
```
Requisitos: **Node ≥ 22.11** y el **Ableton Extensions SDK** (beta).

## 🤖 Copiloto IA

En la pestaña **Copiloto IA** elige proveedor (OpenRouter / OpenAI / OpenCode Zen), pega tu API key
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
└── panels/<id>.js                        # 12 paneles ricos
```

### Añadir un módulo (3 pasos)
1. Copia el `toolRegistry` a `src/modules/<id>/tools.ts` (exporta `createToolRegistry()`).
2. Regístralo en `src/registry/index.ts`:
   ```ts
   m.addModule({ id:"reverb", label:"Reverb & Delay", icon:"🌫️", registry: reverbTools() });
   ```
3. `npm run build`. Aparece en la UI y para el copiloto. **Sin tocar HTML.**

### Paneles ricos
Crea `public/panels/<id>.js` que registre `window.LiveStudioPanels["<id>"] = (panel, helpers) => …`
y añádelo a `index.html`. `shell.js` lo usa en vez del autoform. Ya hay 12: `organizer`, `fxchain`,
`mixconsole`, `stepseq`, `chordpads`, `drums`, `modmatrix`, `drummap`, `clipgraph` (grafo),
`midimon`, `notation` (piano-roll), `takes`.

## 🛠️ Desarrollo

```bash
npm run build       # compila (esbuild)
npm run typecheck   # tsc --noEmit
npm run test        # 118 pruebas de humo (servidor + módulos, song simulado)
npm run package     # build + empaqueta .ablx con la UI
```

## 📚 Catálogo de módulos

<details>
<summary><b>Ver los 94 módulos por lote</b></summary>

- **Lote 1 (núcleo):** Sesión & Pistas · Acordes · Drums · EQ & Análisis
- **Lote 2 (mezcla/sonido):** Sidechain · Stereo & Imaging · Sampler & Slicing · Arreglo & Navegación · Vocal Chain & FX · SFX & Texturas
- **Lote 3 (perf/comp/org):** Generador de Melodías · Performance & Looper · Clips & Escenas · DJ & Mezcla Armónica · Takes & Comping · Clip Colorizer
- **Lote 4:** Gain Staging · Synth Patchbay · Plantillas de Proyecto · Notas de Proyecto · Groove & Humanize · Automatización & Curvas
- **Estrella (paneles ricos):** Organizador de Sesión · Cadenas de Efectos
- **Lote 6:** Compresión & Dinámica · Mixing Assistant IA · Clasificador de Género · EQ Match · MIDI Harmonizer · Quantize & Swing · Delay Calculator · MIDI Randomizer · Stem Splitter · Secciones de Arreglo
- **Lote 7:** Letra → Melodía · FX Chain Presets · Plugin Browser · Time Signature · Crossfade Tool · Device Presets · Microtonal Tuner · Chord Pads · Snapshots · Project Health
- **Lote 8:** Controller Mapper · Notation Viewer · Drum Replacer · Audio → MIDI · Generative Arranger · Setlist Manager · Media Pool · Group Routing · Bulk Track Manager · Tempo & Grid Sync
- **Lote 9:** Mix Scene Saver · API Console · File Manager · Clip Versions · Looper Controller · Drum Map Editor · MIDI Gate · Audio Restorer · Macro Mapper Pro · Step Sequencer
- **Lote 10:** Drum Bus Processor · Rack Preset Cycler · Vocal Comp Editor · Max Device Manager · Recording Router · Cue / Headphone Mixer · Arrangement Looper · Modulation Matrix · Phase Aligner · Spectrogram
- **Lote 11:** Mix Console View · Track Color Coordinator · Export Batch Processor · Rack Builder · Audio Comparer A/B · Vocal Tuner · MIDI Transformer · Sidechain Designer Pro · MIDI LFO · Frequency Splitter
- **Lote 12:** Clip Launch Quantizer · Live Coding Sandbox · Audio Fingerprint ID · Clip Relation Graph · Tempo Tapper · Patch Browser · MIDI Map Visualizer · Cue Mixer · Audio Quantizer · MIDI Monitor

</details>

## 🙏 Créditos

Construido sobre el **Ableton Extensions SDK**. Ensamblado a partir de extensiones propias,
consolidando lo mejor de cada concepto en una sola super-app.

## 📄 Licencia

[MIT](LICENSE) © 2026 Ramón Sesma
