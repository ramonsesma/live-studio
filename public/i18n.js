// Live Studio — i18n: one dictionary, not two trees. shell.js and every panel stay a single
// copy of code; only the visible strings differ per language, looked up via t(key, vars).
// Scope: the shell's fixed chrome (nav, dashboard, copilot, palette). Module/tool descriptions
// and parameters come from the registry (src/modules/*/tools.ts) and stay in English — they
// are also what the AI copilot's LLM prompt reads, so translating them is a separate, larger
// effort tracked on its own.
window.LiveStudioI18n = (function () {
  const STRINGS = {
    en: {
      status_connecting: "connecting…",
      status_connected: "connected",
      status_connected_live: "connected · live",
      status_offline: "offline",

      dashboard: "Dashboard",
      quick_commands: "Quick commands",
      favorites: "Favorites",
      recent: "Recent",
      modules: "Modules",
      assistant: "Assistant",
      ai_copilot: "AI Copilot",
      unpin_favorite: "Unpin favorite",
      pin_favorite: "Pin as favorite",
      profile_select_title: "Work profile — filters the module list",
      profile_all: "All modules",
      profile_mixing: "Mixing",
      profile_sounddesign: "Sound design",
      profile_performance: "Performance",

      loading: "Loading…",
      loading_panel: "Loading panel…",
      panel_error: "Panel error: {{error}}",
      loading_tools: "Loading tools…",
      quick_actions: "Quick actions",
      demo_badge_title: "Returns simulated data — not yet wired to the live Set",
      demo_label: "demo",
      execute: "Execute",
      running: "Running…",

      dashboard_subtitle: "Your project at a glance — refreshes live as the Set changes.",
      overview_error: "Overview error",
      bpm: "BPM",
      key_label: "Key",
      tracks_caption: "Tracks ({{midi}} MIDI · {{audio}} audio)",
      clips_caption: "Clips ({{session}} session · {{arrangement}} arr.)",
      scenes: "Scenes",
      cue_points: "Cue points",
      start_here: "Start here",
      tracks_section: "Tracks",
      last_snapshots: "Last snapshots",
      col_index: "#",
      col_name: "Name",
      col_type: "Type",
      col_state: "State",
      col_session: "Session",
      no_tracks_yet: "No tracks yet.",
      no_snapshots_yet: "No snapshots yet — {{link}} to save your first checkpoint.",
      open_project_snapshot: "open Project Snapshot",

      copilot_subtitle: "Control any module via natural language. Use your tools as functions.",
      provider_label: "Provider",
      api_key_label: "API key",
      model_optional: "Model (optional)",
      save_config: "Save config",
      key_configured: "key configured ✓",
      no_key: "no key",
      saved: "saved",
      plan_toggle_title: "The copilot proposes a step-by-step plan; nothing runs until you apply it",
      plan_toggle_label: "Plan first — review every step before anything touches the Set",
      chat_placeholder: "e.g. create a MIDI track named Bass and generate a pop progression in C minor",
      send: "Send",
      actions_executed: "\n\n({{n}} actions executed)",
      no_plan_returned: "⚠️ No structured plan came back — try rephrasing, or turn plan mode off.",
      generic_error: "error",

      plan_title: "Plan{{summaryPart}} · {{n}} step(s)",
      plan_summary_part: " — {{summary}}",
      unknown_tool_skip: "Unknown tool — this step will be skipped.",
      apply_plan: "Apply plan",
      discard: "Discard",
      undoable_hint: "Each applied step is undoable via Edit History.",
      applying: "Applying…",
      applied: "Applied",
      plan_applied_summary: "Plan applied: {{ok}} ok{{failPart}}{{skippedPart}}. Undo per-step via Edit History.",
      fail_part: ", {{n}} failed",
      skipped_part: ", {{n}} skipped",

      palette_placeholder: "Search a tool or quick action…  (Esc to close)",
      palette_meta: "{{total}} commands · {{tools}} real tools · {{other}} quick actions — showing {{shown}}",
      tag_tool: "tool",
      tag_action: "action",

      lang_toggle_title: "Language / Idioma",
    },
    es: {
      status_connecting: "conectando…",
      status_connected: "conectado",
      status_connected_live: "conectado · en vivo",
      status_offline: "sin conexión",

      dashboard: "Panel de inicio",
      quick_commands: "Comandos rápidos",
      favorites: "Favoritos",
      recent: "Recientes",
      modules: "Módulos",
      assistant: "Asistente",
      ai_copilot: "Copiloto IA",
      unpin_favorite: "Quitar de favoritos",
      pin_favorite: "Fijar como favorito",
      profile_select_title: "Perfil de trabajo — filtra la lista de módulos",
      profile_all: "Todos los módulos",
      profile_mixing: "Mezcla",
      profile_sounddesign: "Diseño de sonido",
      profile_performance: "Directo",

      loading: "Cargando…",
      loading_panel: "Cargando panel…",
      panel_error: "Error del panel: {{error}}",
      loading_tools: "Cargando tools…",
      quick_actions: "Acciones rápidas",
      demo_badge_title: "Devuelve datos simulados — aún no conectado al Set real",
      demo_label: "demo",
      execute: "Ejecutar",
      running: "Ejecutando…",

      dashboard_subtitle: "Tu proyecto de un vistazo — se actualiza en vivo con el Set.",
      overview_error: "Error al cargar el resumen",
      bpm: "BPM",
      key_label: "Tonalidad",
      tracks_caption: "Pistas ({{midi}} MIDI · {{audio}} audio)",
      clips_caption: "Clips ({{session}} sesión · {{arrangement}} arreglo)",
      scenes: "Escenas",
      cue_points: "Puntos de referencia",
      start_here: "Empieza aquí",
      tracks_section: "Pistas",
      last_snapshots: "Últimos snapshots",
      col_index: "#",
      col_name: "Nombre",
      col_type: "Tipo",
      col_state: "Estado",
      col_session: "Sesión",
      no_tracks_yet: "Todavía no hay pistas.",
      no_snapshots_yet: "Aún no hay snapshots — {{link}} para guardar tu primer punto de control.",
      open_project_snapshot: "abre Project Snapshot",

      copilot_subtitle: "Controla cualquier módulo por lenguaje natural. Usa tus tools como funciones.",
      provider_label: "Proveedor",
      api_key_label: "API key",
      model_optional: "Modelo (opcional)",
      save_config: "Guardar configuración",
      key_configured: "key configurada ✓",
      no_key: "sin key",
      saved: "guardado",
      plan_toggle_title: "El copiloto propone un plan paso a paso; nada se ejecuta hasta que lo apliques",
      plan_toggle_label: "Plan primero — revisa cada paso antes de tocar el Set",
      chat_placeholder: "ej. crea una pista MIDI llamada Bass y genera una progresión pop en Do menor",
      send: "Enviar",
      actions_executed: "\n\n({{n}} acciones ejecutadas)",
      no_plan_returned: "⚠️ No llegó un plan estructurado — reformula la petición o desactiva el modo plan.",
      generic_error: "error",

      plan_title: "Plan{{summaryPart}} · {{n}} paso(s)",
      plan_summary_part: " — {{summary}}",
      unknown_tool_skip: "Tool desconocida — este paso se omitirá.",
      apply_plan: "Aplicar plan",
      discard: "Descartar",
      undoable_hint: "Cada paso aplicado es deshacible vía Historial de Ediciones.",
      applying: "Aplicando…",
      applied: "Aplicado",
      plan_applied_summary: "Plan aplicado: {{ok}} ok{{failPart}}{{skippedPart}}. Deshaz paso a paso vía Historial de Ediciones.",
      fail_part: ", {{n}} fallidos",
      skipped_part: ", {{n}} omitidos",

      palette_placeholder: "Busca una tool o acción rápida…  (Esc para cerrar)",
      palette_meta: "{{total}} comandos · {{tools}} tools reales · {{other}} acciones rápidas — mostrando {{shown}}",
      tag_tool: "tool",
      tag_action: "acción",

      lang_toggle_title: "Language / Idioma",
    },
  };

  function detectLang() {
    const saved = (() => { try { return localStorage.getItem("ls-lang"); } catch { return null; } })();
    if (saved === "en" || saved === "es") return saved;
    const nav = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    return nav.startsWith("es") ? "es" : "en";
  }

  let lang = detectLang();

  function t(key, vars) {
    const dict = STRINGS[lang] || STRINGS.en;
    let s = dict[key] != null ? dict[key] : (STRINGS.en[key] != null ? STRINGS.en[key] : key);
    if (vars) for (const k in vars) s = s.split("{{" + k + "}}").join(vars[k] == null ? "" : String(vars[k]));
    return s;
  }

  function setLang(l) { lang = l === "es" ? "es" : "en"; try { localStorage.setItem("ls-lang", lang); } catch { /* no storage */ } }
  function getLang() { return lang; }

  return { t, setLang, getLang };
})();
