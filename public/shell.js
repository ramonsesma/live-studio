// Live Studio — shell: tab router + generic autoform + copilot.
const api = {
  async get(p) { const r = await fetch(p); return r.json(); },
  async post(p, body) { const r = await fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); },
};

const state = { modules: [], active: null, toolCache: {}, chat: [] };

async function boot() {
  // health
  try { await api.get("/health"); setStatus(true, "connected"); }
  catch { setStatus(false, "offline"); }

  const data = await api.get("/api/modules");
  state.modules = data.modules || [];
  renderNav();
  // open the first module
  if (state.modules.length) selectModule(state.modules[0].id);
  else selectCopilot();
}

function setStatus(ok, text) {
  const dot = document.getElementById("status-dot");
  dot.className = "dot " + (ok ? "ok" : "err");
  document.getElementById("status-text").textContent = text;
}

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";

  // Quick command palette launcher (Cmd/Ctrl+K)
  const pal = document.createElement("div");
  pal.className = "nav-item nav-palette";
  pal.innerHTML = `<span class="ico">⌘</span><span class="lbl">Quick commands</span><span class="kbd">⌘K</span>`;
  pal.onclick = () => openPalette();
  nav.appendChild(pal);

  const sep1 = document.createElement("div"); sep1.className = "nav-sep"; sep1.textContent = "Modules"; nav.appendChild(sep1);
  for (const m of state.modules) {
    if (m.hidden) continue;
    const el = document.createElement("div");
    el.className = "nav-item"; el.dataset.id = m.id;
    el.innerHTML = `<span class="ico">${m.icon || "•"}</span><span class="lbl">${m.label}</span><span class="count">${m.toolCount}</span>`;
    el.onclick = () => selectModule(m.id);
    nav.appendChild(el);
  }
  const sep2 = document.createElement("div"); sep2.className = "nav-sep"; sep2.textContent = "Assistant"; nav.appendChild(sep2);
  const cop = document.createElement("div");
  cop.className = "nav-item"; cop.dataset.id = "__copilot";
  cop.innerHTML = `<span class="ico">🤖</span><span class="lbl">AI Copilot</span>`;
  cop.onclick = () => selectCopilot();
  nav.appendChild(cop);
}

function markActive(id) {
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.id === id));
  state.active = id;
}

// ---- Modules (lazy-load + rich panel or autoform) ----
async function selectModule(id) {
  markActive(id);
  const mod = state.modules.find((m) => m.id === id);
  const panel = document.getElementById("panel");

  // Is there a rich panel registered for this module? → use it instead of the autoform.
  const rich = window.LiveStudioPanels && window.LiveStudioPanels[id];
  if (rich) {
    panel.innerHTML = `<div class="panel-empty">Loading panel…</div>`;
    const execute = (toolName, args) => api.post("/api/execute", { name: id + "__" + toolName, args: args || {} });
    try { await rich(panel, { execute, api }); }
    catch (e) { panel.innerHTML = `<div class="panel-empty">Panel error: ${e}</div>`; }
    return;
  }

  panel.innerHTML = `<div class="panel-head"><h1>${mod.icon} ${mod.label}</h1><p>${mod.description || ""}</p></div><div class="panel-empty">Loading tools…</div>`;

  if (!state.toolCache[id]) {
    const res = await api.get("/api/tools?module=" + encodeURIComponent(id));
    state.toolCache[id] = res.tools || [];
  }
  const tools = state.toolCache[id];
  const wrap = document.createElement("div");
  for (const t of tools) wrap.appendChild(renderTool(t));
  panel.querySelector(".panel-empty").replaceWith(wrap);
}

function renderTool(tool) {
  const card = document.createElement("div");
  card.className = "tool";
  const title = tool.originalName || tool.name;
  const demoBadge = tool.demo ? ` <span class="badge-demo" title="Returns simulated data — not yet wired to the live Set">demo</span>` : "";
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
  const btn = document.createElement("button"); btn.className = "btn"; btn.textContent = "Execute";
  const out = document.createElement("div"); out.className = "result"; out.style.display = "none";
  btn.onclick = async () => {
    const args = {};
    for (const [name, input] of Object.entries(inputs)) {
      const raw = input.value;
      if (raw === "" || raw == null) continue;
      const pt = input.dataset.ptype;
      args[name] = pt === "number" ? Number(raw) : pt === "boolean" ? raw === "true" : raw;
    }
    btn.disabled = true; btn.textContent = "Running…";
    try {
      const result = await api.post("/api/execute", { name: tool.name, args });
      out.style.display = "block";
      out.className = "result " + (result.success ? "ok" : "err");
      out.textContent = JSON.stringify(result, null, 2);
    } catch (e) {
      out.style.display = "block"; out.className = "result err"; out.textContent = String(e);
    } finally { btn.disabled = false; btn.textContent = "Execute"; }
  };
  card.appendChild(btn);
  card.appendChild(out);
  return card;
}

// ---- AI Copilot ----
async function selectCopilot() {
  markActive("__copilot");
  const cfg = (await api.get("/api/config")).config || {};
  const panel = document.getElementById("panel");
  panel.innerHTML = `
    <div class="panel-head"><h1>🤖 AI Copilot</h1><p>Control any module via natural language. Use your tools as functions.</p></div>
    <div class="config-grid">
      <div><label class="hint">Provider</label>
        <select id="cfg-provider">
          <option value="openrouter">OpenRouter</option>
          <option value="openai">OpenAI</option>
          <option value="opencode-zen">OpenCode Zen</option>
        </select></div>
      <div><label class="hint">API key</label><input id="cfg-key" type="password" placeholder="sk-…" /></div>
      <div><label class="hint">Model (optional)</label><input id="cfg-model" placeholder="auto" /></div>
    </div>
    <button class="btn ghost" id="cfg-save">Save config</button>
    <span class="hint" id="cfg-status" style="margin-left:10px"></span>
    <div class="chat">
      <div class="chat-log" id="chat-log"></div>
      <div class="chat-input">
        <textarea id="chat-text" placeholder="e.g. create a MIDI track named Bass and generate a pop progression in C minor"></textarea>
        <button class="btn" id="chat-send">Send</button>
      </div>
    </div>`;
  document.getElementById("cfg-provider").value = cfg.provider || "openrouter";
  document.getElementById("cfg-model").value = cfg.model || "";
  document.getElementById("cfg-status").textContent = cfg.hasKey ? "key configured ✓" : "no key";
  document.getElementById("cfg-save").onclick = saveConfig;
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
  document.getElementById("cfg-status").textContent = r.config && r.config.hasKey ? "key configured ✓" : "saved";
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
  try {
    const userMsgs = state.chat.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content }));
    const res = await api.post("/api/chat", { messages: userMsgs });
    if (res.success) {
      state.chat.push({ role: "assistant", content: res.content + (res.toolCalls ? `\n\n(${res.toolCalls} acciones ejecutadas)` : "") });
    } else {
      state.chat.push({ role: "assistant", content: "⚠️ " + (res.error || "error") });
    }
  } catch (e) {
    state.chat.push({ role: "assistant", content: "⚠️ " + String(e) });
  } finally {
    sendBtn.disabled = false; sendBtn.textContent = "Send"; renderChat();
  }
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
      <input id="palette-input" placeholder="Search a tool or quick action…  (Esc to close)" autocomplete="off" />
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
  document.getElementById("palette-meta").textContent = "Loading…";
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
  document.getElementById("palette-meta").textContent =
    `${palette.items.length} comandos · ${tools} tools reales · ${palette.items.length - tools} micro-acciones — mostrando ${palette.filtered.length}`;
  renderPaletteList();
}

function renderPaletteList() {
  const list = document.getElementById("palette-list");
  list.innerHTML = "";
  palette.filtered.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "palette-row" + (i === palette.sel ? " sel" : "");
    const tag = it.kind === "tool" ? "tool" : "acción";
    const demoBadge = it.demo ? ` <span class="badge-demo" title="Returns simulated data">demo</span>` : "";
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
