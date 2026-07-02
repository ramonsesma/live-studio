// Live Studio — shell: tab router + generic autoform + copilot.
const t = window.LiveStudioI18n.t;
const api = {
  async get(p) { const r = await fetch(p); return r.json(); },
  async post(p, body) { const r = await fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); },
};

const state = { modules: [], active: null, toolCache: {}, chat: [], prefs: { favorites: [], recents: [], profile: "all" }, planMode: false };

function initLang() {
  const btn = document.getElementById("lang-toggle");
  if (!btn) return;
  btn.textContent = window.LiveStudioI18n.getLang().toUpperCase();
  btn.onclick = () => {
    window.LiveStudioI18n.setLang(window.LiveStudioI18n.getLang() === "es" ? "en" : "es");
    location.reload(); // simplest correct re-render: every panel/chat state resets cleanly
  };
}
initLang();

async function boot() {
  document.getElementById("status-text").textContent = t("status_connecting");
  // health
  try { await api.get("/health"); setStatus(true, t("status_connected")); }
  catch { setStatus(false, t("status_offline")); }

  // UI prefs (favorites / recents / profile) persist server-side in storageDirectory,
  // so they survive webview reloads — the webview's own localStorage may not.
  try {
    const p = (await api.get("/api/prefs")).prefs || {};
    if (Array.isArray(p.favorites)) state.prefs.favorites = p.favorites;
    if (Array.isArray(p.recents)) state.prefs.recents = p.recents;
    if (typeof p.profile === "string") state.prefs.profile = p.profile;
  } catch { /* defaults */ }

  const data = await api.get("/api/modules");
  state.modules = data.modules || [];
  renderNav();
  initEvents();
  if (state.modules.length) selectHome();
  else selectCopilot();
}

let prefsTimer = null;
function savePrefs() {
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => api.post("/api/prefs", state.prefs).catch(() => {}), 300);
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// ---- Live updates (SSE) ----
// The active panel registers ONE refresh hook via helpers.onSongChanged(fn); switching
// panels replaces it, so a hidden panel never keeps refreshing in the background.
let songChangedHandler = null;

function initEvents() {
  if (typeof EventSource === "undefined") return; // panels still work, just without live refresh
  try {
    const es = new EventSource("/api/events");
    es.addEventListener("hello", () => setStatus(true, t("status_connected_live")));
    es.addEventListener("song", (e) => {
      let detail = {};
      try { detail = JSON.parse(e.data); } catch { /* keep {} */ }
      pulseStatus();
      if (songChangedHandler) { try { songChangedHandler(detail); } catch { /* panel hook must not kill the stream */ } }
    });
    es.onerror = () => setStatus(true, t("status_connected")); // EventSource reconnects on its own
  } catch { /* no live refresh */ }
}

function pulseStatus() {
  const dot = document.getElementById("status-dot");
  if (!dot) return;
  dot.classList.add("pulse");
  setTimeout(() => dot.classList.remove("pulse"), 600);
}

function setStatus(ok, text) {
  const dot = document.getElementById("status-dot");
  dot.className = "dot " + (ok ? "ok" : "err");
  document.getElementById("status-text").textContent = text;
}

const ICO = (id) => (window.LiveStudioIcons ? window.LiveStudioIcons.svg(id) : "•");
const TINT = (id) => (window.LiveStudioIcons ? window.LiveStudioIcons.tint(id) : "var(--muted)");

// Work profiles: curated subsets so e.g. the 40+ generative synths don't crowd the sidebar
// while mixing. Modules outside every profile are still reachable under "All modules".
const PROFILES = {
  all: null,
  mixing: ["session", "eq", "mixconsole", "mixassistant", "compressor", "mastering", "autogain", "resonance", "spectrumcompare", "mixcoach", "health", "mixscene", "drumbus", "grouprouting", "trackmanager", "stemexport", "paramdiff", "devremote", "fxchain", "fxpresets", "vocal", "organizer", "macros", "stemalign", "warpcompare", "loopdetect", "history"],
  sounddesign: ["synth", "sfx", "drumsynth", "slicelab", "mosaic", "riser", "sub808", "padengine", "pluckengine", "acid303", "chordstab", "fmbell", "impact", "subbass", "organ", "vocalchop", "instrumentrender", "brass", "wobble", "choir", "subdrop", "pluckbass", "sawlead", "reese", "marimba", "glitch", "tapehiss", "trumpet", "epiano", "musicbox", "harp", "whistle", "subwobble", "vocoder", "noisefx", "cymbal", "guitar", "sitar", "steeldrum", "accordion", "theremin", "hihat808", "stabhit", "glassbell", "subkick", "reversesweep", "timestretch", "texturemap", "samplebrain", "saferandom", "macromorph", "rackbuilder", "midilfo", "midigate", "audio2midi", "drumreplace"],
  performance: ["performance", "setlist", "tempotap", "quickactions", "launchquant", "sessionbridge", "clips", "chordpads", "temposync", "delaycalc", "notes", "console", "sandbox", "drummap", "stepseq", "mixscene", "history"],
};
const PROFILE_LABEL_KEYS = { all: "profile_all", mixing: "profile_mixing", sounddesign: "profile_sounddesign", performance: "profile_performance" };

const HOME_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/></svg>';

function navItem(m) {
  const el = document.createElement("div");
  el.className = "nav-item"; el.dataset.id = m.id; el.title = m.label;
  const fav = state.prefs.favorites.includes(m.id);
  el.innerHTML = `<span class="ico" style="color:${TINT(m.id)}">${ICO(m.id)}</span><span class="lbl">${m.label}</span><span class="fav-btn${fav ? " on" : ""}" title="${fav ? t("unpin_favorite") : t("pin_favorite")}">${fav ? "★" : "☆"}</span><span class="count">${m.toolCount}</span>`;
  el.onclick = () => selectModule(m.id);
  el.querySelector(".fav-btn").onclick = (e) => { e.stopPropagation(); toggleFavorite(m.id); };
  return el;
}

function toggleFavorite(id) {
  const i = state.prefs.favorites.indexOf(id);
  if (i >= 0) state.prefs.favorites.splice(i, 1); else state.prefs.favorites.push(id);
  savePrefs();
  rerenderNav();
}

// Re-render without losing the sidebar scroll position (favorites/recents change often).
function rerenderNav() {
  const nav = document.getElementById("nav");
  const top = nav.scrollTop;
  renderNav();
  nav.scrollTop = top;
}

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";

  // Dashboard (home)
  const home = document.createElement("div");
  home.className = "nav-item"; home.dataset.id = "__home"; home.title = t("dashboard");
  home.innerHTML = `<span class="ico">${HOME_ICO}</span><span class="lbl">${t("dashboard")}</span>`;
  home.onclick = () => selectHome();
  nav.appendChild(home);

  // Quick command palette launcher (Cmd/Ctrl+K)
  const pal = document.createElement("div");
  pal.className = "nav-item nav-palette"; pal.title = `${t("quick_commands")}  (⌘K)`;
  pal.innerHTML = `<span class="ico">${ICO("palette")}</span><span class="lbl">${t("quick_commands")}</span><span class="kbd">⌘K</span>`;
  pal.onclick = () => openPalette();
  nav.appendChild(pal);

  const byId = {};
  for (const m of state.modules) byId[m.id] = m;

  // Favorites (pinned, always visible regardless of profile)
  const favs = state.prefs.favorites.map((id) => byId[id]).filter((m) => m && !m.hidden);
  if (favs.length) {
    const sep = document.createElement("div"); sep.className = "nav-sep"; sep.innerHTML = `<span>${t("favorites")}</span>`; nav.appendChild(sep);
    for (const m of favs) nav.appendChild(navItem(m));
  }

  // Recents (last used, minus the ones already pinned)
  const recents = state.prefs.recents.filter((id) => !state.prefs.favorites.includes(id)).map((id) => byId[id]).filter((m) => m && !m.hidden).slice(0, 5);
  if (recents.length) {
    const sep = document.createElement("div"); sep.className = "nav-sep"; sep.innerHTML = `<span>${t("recent")}</span>`; nav.appendChild(sep);
    for (const m of recents) nav.appendChild(navItem(m));
  }

  // Work profile selector + filtered module list
  const sep1 = document.createElement("div"); sep1.className = "nav-sep"; sep1.innerHTML = `<span>${t("modules")}</span>`; nav.appendChild(sep1);
  const profWrap = document.createElement("div");
  profWrap.className = "nav-profile";
  profWrap.innerHTML = `<select id="profile-sel" title="${t("profile_select_title")}">${Object.keys(PROFILE_LABEL_KEYS).map((k) => `<option value="${k}"${state.prefs.profile === k ? " selected" : ""}>${t(PROFILE_LABEL_KEYS[k])}</option>`).join("")}</select>`;
  profWrap.querySelector("select").onchange = (e) => { state.prefs.profile = e.target.value; savePrefs(); rerenderNav(); };
  nav.appendChild(profWrap);

  const filter = PROFILES[state.prefs.profile] ? new Set(PROFILES[state.prefs.profile]) : null;
  for (const m of state.modules) {
    if (m.hidden) continue;
    if (filter && !filter.has(m.id)) continue;
    nav.appendChild(navItem(m));
  }

  const sep2 = document.createElement("div"); sep2.className = "nav-sep"; sep2.innerHTML = `<span>${t("assistant")}</span>`; nav.appendChild(sep2);
  const cop = document.createElement("div");
  cop.className = "nav-item"; cop.dataset.id = "__copilot"; cop.title = t("ai_copilot");
  cop.innerHTML = `<span class="ico" style="color:${TINT("copilot")}">${ICO("copilot")}</span><span class="lbl">${t("ai_copilot")}</span>`;
  cop.onclick = () => selectCopilot();
  nav.appendChild(cop);

  if (state.active) markActive(state.active);
}

// Collapsible sidebar — persists across sessions.
function initCollapse() {
  const collapsed = localStorage.getItem("ls-collapsed") === "1";
  document.getElementById("app").classList.toggle("collapsed", collapsed);
  const btn = document.getElementById("collapse-toggle");
  if (btn) btn.onclick = () => {
    const on = !document.getElementById("app").classList.contains("collapsed");
    document.getElementById("app").classList.toggle("collapsed", on);
    localStorage.setItem("ls-collapsed", on ? "1" : "0");
  };
}
initCollapse();

function markActive(id) {
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.id === id));
  state.active = id;
}

// ---- Modules (lazy-load + rich panel or autoform) ----
function recordRecent(id) {
  const r = state.prefs.recents.filter((x) => x !== id);
  r.unshift(id);
  state.prefs.recents = r.slice(0, 8);
  savePrefs();
  rerenderNav();
}

// Lazy panel loading: index.html no longer lists all 115 panel scripts up front (that was
// ~672 KB fetched and parsed before the UI could even show the first module). Instead each
// panel's <script> is injected on first visit to its module and cached in panelLoadState —
// a 404 (module has no rich panel) resolves false via onerror, so the autoform kicks in with
// no separate manifest needed to know which modules have one.
const panelLoadState = {};
function loadPanelScript(id) {
  if (panelLoadState[id]) return panelLoadState[id];
  const p = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "/panels/" + id + ".js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  panelLoadState[id] = p;
  return p;
}

async function selectModule(id) {
  markActive(id);
  songChangedHandler = null; // the outgoing panel's live-refresh hook dies with it
  recordRecent(id);
  const mod = state.modules.find((m) => m.id === id);
  const panel = document.getElementById("panel");
  panel.innerHTML = `<div class="panel-empty">${t("loading")}</div>`;

  // Is there a rich panel registered for this module? → use it instead of the autoform.
  const hasPanelFile = await loadPanelScript(id);
  const rich = hasPanelFile && window.LiveStudioPanels && window.LiveStudioPanels[id];
  if (rich) {
    panel.innerHTML = `<div class="panel-empty">${t("loading_panel")}</div>`;
    const execute = (toolName, args) => api.post("/api/execute", { name: id + "__" + toolName, args: args || {} });
    const onSongChanged = (fn) => { songChangedHandler = typeof fn === "function" ? fn : null; };
    try { await rich(panel, { execute, api, onSongChanged }); }
    catch (e) { panel.innerHTML = `<div class="panel-empty">${t("panel_error", { error: e })}</div>`; }
    await injectQuickActions(panel, id);
    return;
  }

  panel.innerHTML = `<div class="panel-head"><h1><span class="head-ico" style="color:${TINT(mod.id)}">${ICO(mod.id)}</span> ${mod.label}</h1><p>${mod.description || ""}</p></div><div class="panel-empty">${t("loading_tools")}</div>`;

  if (!state.toolCache[id]) {
    const res = await api.get("/api/tools?module=" + encodeURIComponent(id));
    state.toolCache[id] = res.tools || [];
  }
  const tools = state.toolCache[id];
  const wrap = document.createElement("div");
  for (const t of tools) wrap.appendChild(renderTool(t));
  panel.querySelector(".panel-empty").replaceWith(wrap);
  await injectQuickActions(panel, id);
}

// Surface a module's own quick actions (presets that route to its tools) as one-click chips
// at the top of its panel — the same actions the Cmd-K palette runs, now in context.
async function injectQuickActions(panel, id) {
  try {
    if (!window.__qaCache) { const r = await api.post("/api/execute", { name: "quickactions__list_quick_actions", args: {} }); window.__qaCache = r && r.success ? r.data.actions : []; }
    const acts = (window.__qaCache || []).filter((a) => String(a.tool || "").split("__")[0] === id);
    if (!acts.length) return;
    const strip = document.createElement("div");
    strip.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 14px;padding:8px 11px;background:var(--bg2);border:1px solid var(--line);border-radius:8px";
    strip.innerHTML = `<span style="font-size:11px;color:var(--muted);margin-right:2px"><i class="ti ti-bolt" aria-hidden="true"></i> ${t("quick_actions")}</span>`;
    for (const a of acts) {
      const b = document.createElement("button");
      b.textContent = a.name;
      b.style.cssText = "font-size:11px;border:1px solid var(--line);background:var(--bg3);color:var(--txt);border-radius:6px;padding:3px 9px;cursor:pointer";
      b.onclick = async () => { const old = b.textContent; b.disabled = true; b.textContent = "…"; const r = await api.post("/api/execute", { name: a.tool, args: a.args }); b.textContent = (r && r.success ? "✓ " : "✕ ") + old; setTimeout(() => { b.textContent = old; b.disabled = false; }, 1400); };
      strip.appendChild(b);
    }
    const head = panel.querySelector(".panel-head");
    if (head) head.insertAdjacentElement("afterend", strip); else panel.insertBefore(strip, panel.firstChild);
  } catch { /* non-fatal */ }
}

function renderTool(tool) {
  const card = document.createElement("div");
  card.className = "tool";
  const title = tool.originalName || tool.name;
  const demoBadge = tool.demo ? ` <span class="badge-demo" title="${t("demo_badge_title")}">${t("demo_label")}</span>` : "";
  card.innerHTML = `<h3>${title}${demoBadge}</h3><p class="desc">${tool.description || ""}</p>`;
  const params = tool.parameters || {};
  const inputs = {};
  for (const [name, p] of Object.entries(params)) {
    const field = document.createElement("div"); field.className = "field";
    const lbl = document.createElement("label");
    lbl.innerHTML = `${name}${p.required ? ' <span class="req">*</span>' : ""} <span class="hint">${p.description || ""}</span>`;
    field.appendChild(lbl);
    let input;
    if (p.enum) {
      input = document.createElement("select");
      if (!p.required) { const o = document.createElement("option"); o.value = ""; o.textContent = "—"; input.appendChild(o); }
      for (const v of p.enum) { const o = document.createElement("option"); o.value = v; o.textContent = v; input.appendChild(o); }
    } else if (p.type === "boolean") {
      input = document.createElement("select");
      ["", "true", "false"].forEach((v) => { const o = document.createElement("option"); o.value = v; o.textContent = v || "—"; input.appendChild(o); });
    } else {
      input = document.createElement("input");
      input.type = p.type === "number" ? "number" : "text";
      input.placeholder = p.type === "number" ? "number" : "text";
    }
    input.dataset.ptype = p.type;
    field.appendChild(input);
    inputs[name] = input;
    card.appendChild(field);
  }
  const btn = document.createElement("button"); btn.className = "btn"; btn.textContent = t("execute");
  const out = document.createElement("div"); out.className = "result"; out.style.display = "none";
  btn.onclick = async () => {
    const args = {};
    for (const [name, input] of Object.entries(inputs)) {
      const raw = input.value;
      if (raw === "" || raw == null) continue;
      const pt = input.dataset.ptype;
      args[name] = pt === "number" ? Number(raw) : pt === "boolean" ? raw === "true" : raw;
    }
    btn.disabled = true; btn.textContent = t("running");
    try {
      const result = await api.post("/api/execute", { name: tool.name, args });
      out.style.display = "block";
      out.className = "result " + (result.success ? "ok" : "err");
      out.textContent = JSON.stringify(result, null, 2);
    } catch (e) {
      out.style.display = "block"; out.className = "result err"; out.textContent = String(e);
    } finally { btn.disabled = false; btn.textContent = t("execute"); }
  };
  card.appendChild(btn);
  card.appendChild(out);
  return card;
}

// ---- Dashboard (home) ----
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

async function selectHome() {
  markActive("__home");
  songChangedHandler = null;
  const panel = document.getElementById("panel");
  panel.innerHTML = `<div class="panel-head"><h1><span class="head-ico">${HOME_ICO}</span> ${t("dashboard")}</h1><p>${t("dashboard_subtitle")}</p></div><div class="panel-empty">${t("loading")}</div>`;

  const render = async () => {
    const r = await api.get("/api/overview");
    if (!r.success) { panel.innerHTML = `<div class="panel-empty">${t("overview_error")}</div>`; return; }
    const d = r.data;
    const key = d.rootNote != null && d.scaleName ? `${NOTE_NAMES[((d.rootNote % 12) + 12) % 12]} ${d.scaleName}` : "—";

    // Last snapshots (best effort — the module handles its own storage)
    let snaps = [];
    try {
      const s = await api.post("/api/execute", { name: "projectsnapshot__list", args: {} });
      if (s.success && s.data && Array.isArray(s.data.snapshots)) snaps = s.data.snapshots.slice(-3).reverse();
    } catch { /* module unavailable */ }

    const cards = [
      { num: d.tempo != null ? Number(d.tempo).toFixed(1) : "—", cap: t("bpm") },
      { num: key, cap: t("key_label") },
      { num: `${d.tracks.total}`, cap: t("tracks_caption", { midi: d.tracks.midi, audio: d.tracks.audio }) },
      { num: `${d.clips.session + d.clips.arrangement}`, cap: t("clips_caption", { session: d.clips.session, arrangement: d.clips.arrangement }) },
      { num: `${d.scenes}`, cap: t("scenes") },
      { num: `${d.cuePoints}`, cap: t("cue_points") },
    ];

    const chips = (ids) => ids.map((id) => {
      const m = state.modules.find((x) => x.id === id);
      return m ? `<span class="chip" data-mod="${m.id}"><span class="ico" style="color:${TINT(m.id)}">${ICO(m.id)}</span>${esc(m.label)}</span>` : "";
    }).join("");
    const favIds = state.prefs.favorites.slice(0, 8);
    const recIds = state.prefs.recents.filter((id) => !favIds.includes(id)).slice(0, 5);
    const suggested = ["health", "mixcoach", "organizer"].filter((id) => !favIds.includes(id) && !recIds.includes(id));

    const rows = (d.trackList || []).map((t) => `
      <tr class="dash-row" data-i="${t.index}">
        <td class="dim">${t.index}</td><td>${esc(t.name || "")}</td><td class="dim">${t.kind}</td>
        <td>${t.mute ? "M" : ""}${t.solo ? " S" : ""}${t.arm ? " ●" : ""}</td><td class="dim">${t.sessionClips} clips</td>
      </tr>`).join("");

    panel.innerHTML = `
      <div class="panel-head"><h1><span class="head-ico">${HOME_ICO}</span> ${t("dashboard")}</h1><p>${t("dashboard_subtitle")}</p></div>
      <div class="dash-grid">${cards.map((c) => `<div class="dash-card"><div class="num">${esc(String(c.num))}</div><div class="cap">${esc(c.cap)}</div></div>`).join("")}</div>
      ${favIds.length ? `<div class="dash-section"><h3>${t("favorites")}</h3><div class="dash-chips">${chips(favIds)}</div></div>` : ""}
      ${recIds.length ? `<div class="dash-section"><h3>${t("recent")}</h3><div class="dash-chips">${chips(recIds)}</div></div>` : ""}
      ${suggested.length ? `<div class="dash-section"><h3>${t("start_here")}</h3><div class="dash-chips">${chips(suggested)}</div></div>` : ""}
      <div class="dash-section"><h3>${t("tracks_section")}</h3>
        ${rows ? `<table class="dash-table"><thead><tr><th>${t("col_index")}</th><th>${t("col_name")}</th><th>${t("col_type")}</th><th>${t("col_state")}</th><th>${t("col_session")}</th></tr></thead><tbody>${rows}</tbody></table>` : `<span class="hint">${t("no_tracks_yet")}</span>`}
      </div>
      <div class="dash-section"><h3>${t("last_snapshots")}</h3>
        ${snaps.length
          ? `<div class="dash-chips">${snaps.map((s) => `<span class="chip" data-mod="projectsnapshot" title="${t("open_project_snapshot")}">📸 ${esc(s.label || s.id)}</span>`).join("")}</div>`
          : `<span class="hint">${t("no_snapshots_yet", { link: `<a href="#" id="dash-snap-link">${t("open_project_snapshot")}</a>` })}</span>`}
      </div>`;

    panel.querySelectorAll(".chip[data-mod]").forEach((c) => { c.onclick = () => selectModule(c.dataset.mod); });
    const snapLink = panel.querySelector("#dash-snap-link");
    if (snapLink) snapLink.onclick = (e) => { e.preventDefault(); selectModule("projectsnapshot"); };
  };

  await render();
  songChangedHandler = render; // SSE tick → re-render with fresh overview
}

// ---- AI Copilot ----
async function selectCopilot() {
  markActive("__copilot");
  songChangedHandler = null;
  const cfg = (await api.get("/api/config")).config || {};
  const panel = document.getElementById("panel");
  panel.innerHTML = `
    <div class="panel-head"><h1><span class="head-ico" style="color:${TINT("copilot")}">${ICO("copilot")}</span> ${t("ai_copilot")}</h1><p>${t("copilot_subtitle")}</p></div>
    <div class="config-grid">
      <div><label class="hint">${t("provider_label")}</label>
        <select id="cfg-provider">
          <option value="openrouter">OpenRouter</option>
          <option value="openai">OpenAI</option>
          <option value="gemini">Gemini</option>
          <option value="nvidia">NVIDIA NIM</option>
          <option value="opencode-zen">OpenCode Zen</option>
        </select></div>
      <div><label class="hint">${t("api_key_label")}</label><input id="cfg-key" type="password" placeholder="sk-…" /></div>
      <div><label class="hint">${t("model_optional")}</label><input id="cfg-model" placeholder="auto" /></div>
    </div>
    <button class="btn ghost" id="cfg-save">${t("save_config")}</button>
    <span class="hint" id="cfg-status" style="margin-left:10px"></span>
    <label class="plan-toggle" title="${t("plan_toggle_title")}">
      <input type="checkbox" id="plan-mode" ${state.planMode ? "checked" : ""}/> ${t("plan_toggle_label")}
    </label>
    <div class="chat">
      <div class="chat-log" id="chat-log"></div>
      <div class="chat-input">
        <textarea id="chat-text" placeholder="${t("chat_placeholder")}"></textarea>
        <button class="btn" id="chat-send">${t("send")}</button>
      </div>
    </div>`;
  document.getElementById("cfg-provider").value = cfg.provider || "openrouter";
  document.getElementById("cfg-model").value = cfg.model || "";
  document.getElementById("cfg-status").textContent = cfg.hasKey ? t("key_configured") : t("no_key");
  document.getElementById("cfg-save").onclick = saveConfig;
  document.getElementById("plan-mode").onchange = (e) => { state.planMode = e.target.checked; };
  document.getElementById("chat-send").onclick = sendChat;
  document.getElementById("chat-text").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } });
  renderChat();
}

async function saveConfig() {
  const body = {
    provider: document.getElementById("cfg-provider").value,
    apiKey: document.getElementById("cfg-key").value,
    model: document.getElementById("cfg-model").value,
  };
  const r = await api.post("/api/config", body);
  document.getElementById("cfg-status").textContent = r.config && r.config.hasKey ? t("key_configured") : t("saved");
}

function renderChat() {
  const log = document.getElementById("chat-log");
  if (!log) return;
  log.innerHTML = "";
  for (const m of state.chat) {
    const el = document.createElement("div");
    el.className = "msg " + m.role;
    el.textContent = (m.role === "tool" ? "🔧 " : "") + m.content;
    log.appendChild(el);
  }
  log.scrollTop = log.scrollHeight;
}

async function sendChat() {
  const ta = document.getElementById("chat-text");
  const text = ta.value.trim();
  if (!text) return;
  ta.value = "";
  state.chat.push({ role: "user", content: text });
  renderChat();
  const sendBtn = document.getElementById("chat-send");
  sendBtn.disabled = true; sendBtn.textContent = "…";
  let pendingPlan = null; // rendered AFTER the final renderChat(), which rebuilds the log
  try {
    const userMsgs = state.chat.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content }));
    const res = await api.post("/api/chat", state.planMode ? { messages: userMsgs, mode: "plan" } : { messages: userMsgs });
    if (res.success && state.planMode) {
      state.chat.push({ role: "assistant", content: stripPlanJson(res.content) || "(plan below)" });
      if (res.plan && res.plan.length) pendingPlan = { plan: res.plan, summary: res.summary };
      else state.chat.push({ role: "assistant", content: t("no_plan_returned") });
    } else if (res.success) {
      state.chat.push({ role: "assistant", content: res.content + (res.toolCalls ? t("actions_executed", { n: res.toolCalls }) : "") });
    } else {
      state.chat.push({ role: "assistant", content: "⚠️ " + (res.error || t("generic_error")) });
    }
  } catch (e) {
    state.chat.push({ role: "assistant", content: "⚠️ " + String(e) });
  } finally {
    sendBtn.disabled = false; sendBtn.textContent = t("send"); renderChat();
    if (pendingPlan) renderPlanCard(pendingPlan.plan, pendingPlan.summary);
  }
}

// Hide the machine-readable json block from the chat bubble — the plan card shows it nicely.
function stripPlanJson(s) { return String(s || "").replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, "").trim(); }

// Plan card: the reviewable, user-confirmed execution of a copilot plan. Each step runs
// through the normal /api/execute path, so destructive steps land in Edit History undo.
function renderPlanCard(plan, summary) {
  const log = document.getElementById("chat-log");
  if (!log) return;
  const card = document.createElement("div");
  card.className = "plan-card";
  const summaryPart = summary ? t("plan_summary_part", { summary: esc(summary) }) : "";
  card.innerHTML = `
    <div class="plan-title">${t("plan_title", { summaryPart, n: plan.length })}</div>
    ${plan.map((s, i) => `
      <div class="plan-step">
        <span class="plan-status" data-step="${i}">${s.unknown ? "⚠️" : "•"}</span>
        <div class="plan-body">
          <code>${esc(s.tool)}</code>${Object.keys(s.args || {}).length ? ` <span class="plan-args">${esc(JSON.stringify(s.args))}</span>` : ""}
          ${s.why ? `<div class="plan-why">${esc(s.why)}</div>` : ""}
          ${s.unknown ? `<div class="plan-why">${t("unknown_tool_skip")}</div>` : ""}
        </div>
      </div>`).join("")}
    <div class="plan-actions">
      <button class="btn" data-act="apply">${t("apply_plan")}</button>
      <button class="btn ghost" data-act="discard">${t("discard")}</button>
      <span class="hint">${t("undoable_hint")}</span>
    </div>`;
  log.appendChild(card);
  log.scrollTop = log.scrollHeight;

  const applyBtn = card.querySelector('[data-act="apply"]');
  const discardBtn = card.querySelector('[data-act="discard"]');
  discardBtn.onclick = () => card.remove();
  applyBtn.onclick = async () => {
    applyBtn.disabled = true; discardBtn.disabled = true; applyBtn.textContent = t("applying");
    let ok = 0, fail = 0, skipped = 0;
    for (let i = 0; i < plan.length; i++) {
      const st = card.querySelector(`[data-step="${i}"]`);
      const s = plan[i];
      if (s.unknown) { st.textContent = "⤼"; skipped++; continue; }
      st.textContent = "…";
      try {
        const r = await api.post("/api/execute", { name: s.tool, args: s.args || {} });
        st.textContent = r.success ? "✓" : "✕";
        if (r.success) ok++; else { fail++; st.title = r.error || t("generic_error"); }
      } catch (e) { st.textContent = "✕"; st.title = String(e); fail++; }
    }
    applyBtn.textContent = t("applied");
    const failPart = fail ? t("fail_part", { n: fail }) : "";
    const skippedPart = skipped ? t("skipped_part", { n: skipped }) : "";
    state.chat.push({ role: "tool", content: t("plan_applied_summary", { ok, failPart, skippedPart }) });
    renderChat();
  };
}

// ---- Paleta de comandos rápidos (Cmd/Ctrl + K) ----
const palette = { built: false, loaded: false, items: [], filtered: [], sel: 0 };

function buildPalette() {
  if (palette.built) return;
  const ov = document.createElement("div");
  ov.id = "palette-overlay";
  ov.style.display = "none";
  ov.innerHTML = `
    <div id="palette">
      <input id="palette-input" placeholder="${t("palette_placeholder")}" autocomplete="off" />
      <div id="palette-meta"></div>
      <div id="palette-list"></div>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener("click", (e) => { if (e.target === ov) closePalette(); });
  const input = ov.querySelector("#palette-input");
  input.addEventListener("input", () => filterPalette(input.value));
  input.addEventListener("keydown", paletteKeydown);
  palette.built = true;
}

async function ensurePaletteData() {
  if (palette.loaded) return;
  // 1) tools reales (todos los módulos)
  const tools = (await api.get("/api/tools")).tools || [];
  const toolItems = tools.map((t) => ({
    kind: "tool", id: t.name, module: t.module, demo: !!t.demo,
    title: (t.originalName || t.name), subtitle: t.description || "",
    badge: t.module, required: Object.entries(t.parameters || {}).filter(([, v]) => v.required).map(([k]) => k),
  }));
  // 2) quick actions — each routes to a real tool with preset args
  const qa = await api.post("/api/execute", { name: "quickactions__list_quick_actions", args: {} });
  const quickItems = (qa.success ? qa.data.actions : []).map((a) => ({
    kind: "quick", group: a.group, action: a.name, tool: a.tool, targs: a.args,
    title: `${a.group}: ${a.name}`, subtitle: a.tool, badge: "action",
  }));
  palette.items = [...toolItems, ...quickItems];
  palette.loaded = true;
}

async function openPalette() {
  buildPalette();
  const ov = document.getElementById("palette-overlay");
  ov.style.display = "flex";
  const input = ov.querySelector("#palette-input");
  input.value = ""; input.focus();
  document.getElementById("palette-meta").textContent = t("loading");
  await ensurePaletteData();
  filterPalette("");
}
function closePalette() { const ov = document.getElementById("palette-overlay"); if (ov) ov.style.display = "none"; }

function filterPalette(q) {
  q = q.trim().toLowerCase();
  const items = q
    ? palette.items.filter((it) => (it.title + " " + it.subtitle + " " + (it.badge || "")).toLowerCase().includes(q))
    : palette.items;
  palette.filtered = items.slice(0, 80);
  palette.sel = 0;
  const tools = palette.items.filter((i) => i.kind === "tool").length;
  document.getElementById("palette-meta").textContent = t("palette_meta", {
    total: palette.items.length, tools, other: palette.items.length - tools, shown: palette.filtered.length,
  });
  renderPaletteList();
}

function renderPaletteList() {
  const list = document.getElementById("palette-list");
  list.innerHTML = "";
  palette.filtered.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "palette-row" + (i === palette.sel ? " sel" : "");
    const tag = it.kind === "tool" ? t("tag_tool") : t("tag_action");
    const demoBadge = it.demo ? ` <span class="badge-demo" title="${t("demo_badge_title")}">${t("demo_label")}</span>` : "";
    row.innerHTML = `<span class="palette-tag ${it.kind}">${tag}</span>
      <span class="palette-title">${it.title}${demoBadge}</span>
      <span class="palette-sub">${it.subtitle || ""}</span>
      <span class="palette-badge">${it.badge || ""}</span>`;
    row.onmouseenter = () => { palette.sel = i; updatePaletteSel(); };
    row.onclick = () => runPaletteItem(it);
    list.appendChild(row);
  });
}
function updatePaletteSel() {
  const rows = document.querySelectorAll(".palette-row");
  rows.forEach((r, i) => r.classList.toggle("sel", i === palette.sel));
  const cur = rows[palette.sel]; if (cur) cur.scrollIntoView({ block: "nearest" });
}
function paletteKeydown(e) {
  if (e.key === "Escape") { closePalette(); return; }
  if (e.key === "ArrowDown") { e.preventDefault(); palette.sel = Math.min(palette.sel + 1, palette.filtered.length - 1); updatePaletteSel(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); palette.sel = Math.max(palette.sel - 1, 0); updatePaletteSel(); }
  else if (e.key === "Enter") { e.preventDefault(); const it = palette.filtered[palette.sel]; if (it) runPaletteItem(it); }
}

async function runPaletteItem(it) {
  if (it.kind === "tool") {
    if (it.required && it.required.length) {
      // Necesita parámetros → abre el módulo para rellenarlos.
      closePalette();
      selectModule(it.module);
      return;
    }
    const res = await api.post("/api/execute", { name: it.id, args: {} });
    toast(res.success ? `✓ ${it.title}` : `✗ ${res.error || "error"}`, res.success);
  } else {
    // Quick action → run its real target tool directly.
    const res = await api.post("/api/execute", { name: it.tool, args: it.targs || {} });
    toast(res.success ? `✓ ${it.title}` : `✗ ${res.error || "error"}`, res.success);
  }
}

function toast(msg, ok) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = ok ? "ok" : "err";
  t.style.opacity = "1";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.style.opacity = "0"; }, 2200);
}

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openPalette(); }
});

boot();
