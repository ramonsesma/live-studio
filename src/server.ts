import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
// Import URL/URLSearchParams explicitly: the Live Extension Host runs the extension
// in a context that does NOT expose Node's WHATWG globals (URL was "not defined" at
// runtime), so we must pull them from node:url rather than rely on the global.
import { fileURLToPath, URL } from "node:url";
import { Bridge } from "./bridge.js";
import { createLLMClient, type LLMClient } from "./core/llm.js";
import { saveJson, loadJson } from "./core/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Sirve la UI tanto en build (dist/ui) como en dev (public/) — primera ruta que exista.
const UI_DIR = [
  path.join(__dirname, "ui"),        // dist/ui (build)
  path.join(__dirname, "../public"), // dev: src/ -> ../public
  path.join(__dirname, "../dist/ui"),
].find((p) => fs.existsSync(p)) || path.join(__dirname, "ui");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

interface Config { provider: string; apiKey: string; model: string; }

export interface AppServer { url: string; port: number; close: () => Promise<void>; }

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("Invalid JSON")); } });
    req.on("error", reject);
  });
}
function sendJson(res: http.ServerResponse, status: number, data: unknown) {
  // Never write twice (e.g. when an error is thrown after a response was already sent),
  // and serialize BEFORE writeHead so a stringify failure can't leave a half-written
  // response. The SDK uses `bigint` for handles/indices, which JSON.stringify rejects,
  // so coerce those; if serialization still fails, send a safe error payload instead.
  if (res.headersSent) return;
  let payload: string;
  try {
    payload = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v));
  } catch (err) {
    status = 500;
    payload = JSON.stringify({ success: false, error: `Response could not be serialized: ${err instanceof Error ? err.message : String(err)}` });
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

export async function startServer(bridge: Bridge): Promise<AppServer> {
  const config: Config = { provider: "openrouter", apiKey: "", model: "" };

  // ---- Live updates (SSE) ----
  // The webview subscribes to /api/events; a poller diffs a cheap song fingerprint and
  // broadcasts "song" events only when something actually changed. The poller only runs
  // while at least one client is connected, so a closed webview costs Live nothing.
  const sseClients = new Set<http.ServerResponse>();
  let lastFingerprint: string | null = null;
  let poller: ReturnType<typeof setInterval> | null = null;
  let polling = false;
  const broadcast = (event: string, data: unknown) => {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of sseClients) { try { c.write(msg); } catch { sseClients.delete(c); } }
  };
  const pollTick = async () => {
    if (polling) return; // a slow tick (many tracks) must not overlap the next one
    polling = true;
    try {
      const fp = await bridge.fingerprint();
      if (fp !== null && lastFingerprint !== null && fp !== lastFingerprint) broadcast("song", { changed: true, at: Date.now() });
      if (fp !== null) lastFingerprint = fp;
    } finally { polling = false; }
  };
  const ensurePoller = () => {
    if (poller || !sseClients.size) return;
    poller = setInterval(pollTick, 1500);
    (poller as any).unref?.();
  };
  const stopPollerIfIdle = () => {
    if (poller && !sseClients.size) { clearInterval(poller); poller = null; lastFingerprint = null; }
  };

  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    const method = req.method || "GET";
    if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    try {
      const url = new URL(req.url || "/", "http://localhost");
      // ---- API ----
      if (url.pathname === "/api/modules" && method === "GET") {
        sendJson(res, 200, { modules: bridge.getModules() });
        return;
      }
      if (url.pathname === "/api/tools" && method === "GET") {
        const mod = url.searchParams.get("module");
        const all = bridge.getTools();
        sendJson(res, 200, { tools: mod ? all.filter((t: any) => t.module === mod) : all });
        return;
      }
      if (url.pathname === "/api/overview" && method === "GET") {
        sendJson(res, 200, { success: true, data: await bridge.overview() });
        return;
      }
      if (url.pathname === "/api/prefs" && method === "GET") {
        sendJson(res, 200, { success: true, prefs: loadJson("prefs", "ui") || {} });
        return;
      }
      if (url.pathname === "/api/prefs" && method === "POST") {
        const body = await parseBody(req);
        saveJson("prefs", "ui", body || {});
        sendJson(res, 200, { success: true });
        return;
      }
      if (url.pathname === "/api/events" && method === "GET") {
        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
        res.write("retry: 3000\n\nevent: hello\ndata: {}\n\n");
        sseClients.add(res);
        ensurePoller();
        req.on("close", () => { sseClients.delete(res); stopPollerIfIdle(); });
        return;
      }
      if (url.pathname === "/api/execute" && method === "POST") {
        const body = await parseBody(req);
        const result = await bridge.executeTool(body.name as string, (body.args as Record<string, unknown>) || {});
        sendJson(res, 200, result);
        return;
      }
      if (url.pathname === "/api/listen" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.listen(body as any));
        return;
      }
      if (url.pathname === "/api/autogain" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.autoGain(body as any));
        return;
      }
      if (url.pathname === "/api/maskmatrix" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.maskMatrix(body as any));
        return;
      }
      if (url.pathname === "/api/stemexport" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.exportStems(body as any));
        return;
      }
      if (url.pathname === "/api/mixcoach" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.mixCoach(body as any));
        return;
      }
      if (url.pathname === "/api/texturemap" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.textureMap(body as any));
        return;
      }
      if (url.pathname === "/api/snapshot" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.snapshot(body as any));
        return;
      }
      if (url.pathname === "/api/score/export" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.scoreExport(body as any));
        return;
      }
      if (url.pathname === "/api/stemalign" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.stemAlign(body as any));
        return;
      }
      if (url.pathname === "/api/samplebrain" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.sampleBrain(body as any));
        return;
      }
      if (url.pathname === "/api/macromorph" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.macroMorph(body as any));
        return;
      }
      if (url.pathname === "/api/loopdetect" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.loopDetect(body as any));
        return;
      }
      if (url.pathname === "/api/warpcompare" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.warpCompare(body as any));
        return;
      }
      if (url.pathname === "/api/saferandom" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.safeRandomize(body as any));
        return;
      }
      if (url.pathname === "/api/audio2midi" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.audioToMidi(body as any));
        return;
      }
      if (url.pathname === "/api/groovefromaudio" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.grooveFromAudio(body as any));
        return;
      }
      if (url.pathname === "/api/timestretch" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.timeStretch(body as any));
        return;
      }
      if (url.pathname === "/api/drumsynth" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.synthDrum(body as any));
        return;
      }
      if (url.pathname === "/api/drumsynthaudio" && method === "GET") {
        const buf = bridge.drumAudio(url.searchParams.get("id") || "");
        if (!buf) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": String(buf.length) }); res.end(buf);
        return;
      }
      if (url.pathname === "/api/slicelab" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.sliceMutate(body as any));
        return;
      }
      if (url.pathname === "/api/mosaic" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.mosaicGen(body as any));
        return;
      }
      if (url.pathname === "/api/riser" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.riserGen(body as any));
        return;
      }
      if (url.pathname === "/api/sub808" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.synth808Gen(body as any));
        return;
      }
      if (url.pathname === "/api/pad" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.padGen(body as any));
        return;
      }
      if (url.pathname === "/api/pluck" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.pluckGen(body as any));
        return;
      }
      if (url.pathname === "/api/acid" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.acidGen(body as any));
        return;
      }
      if (url.pathname === "/api/stab" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.stabGen(body as any));
        return;
      }
      if (url.pathname === "/api/bell" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.bellGen(body as any));
        return;
      }
      if (url.pathname === "/api/impact" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.impactGen(body as any));
        return;
      }
      if (url.pathname === "/api/subbass" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.subBassGen(body as any));
        return;
      }
      if (url.pathname === "/api/organ" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.organGen(body as any));
        return;
      }
      if (url.pathname === "/api/vocalchop" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.vocalChopGen(body as any));
        return;
      }
      if (url.pathname === "/api/render" && method === "POST") {
        const body = await parseBody(req);
        sendJson(res, 200, await bridge.renderClip(body as any));
        return;
      }
      if (url.pathname === "/api/brass" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.brassGen(body as any)); return; }
      if (url.pathname === "/api/wobble" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.wobbleGen(body as any)); return; }
      if (url.pathname === "/api/choir" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.choirGen(body as any)); return; }
      if (url.pathname === "/api/subdrop" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.subDropGen(body as any)); return; }
      if (url.pathname === "/api/pluckbass" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.pluckBassGen(body as any)); return; }
      if (url.pathname === "/api/sawlead" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.sawLeadGen(body as any)); return; }
      if (url.pathname === "/api/reese" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.reeseGen(body as any)); return; }
      if (url.pathname === "/api/marimba" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.marimbaGen(body as any)); return; }
      if (url.pathname === "/api/glitch" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.glitchGen(body as any)); return; }
      if (url.pathname === "/api/tapehiss" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.tapeHissGen(body as any)); return; }
      if (url.pathname === "/api/trumpet" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.trumpetGen(body as any)); return; }
      if (url.pathname === "/api/epiano" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.ePianoGen(body as any)); return; }
      if (url.pathname === "/api/musicbox" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.musicBoxGen(body as any)); return; }
      if (url.pathname === "/api/harp" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.harpGen(body as any)); return; }
      if (url.pathname === "/api/whistle" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.whistleGen(body as any)); return; }
      if (url.pathname === "/api/subwobble" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.subWobbleGen(body as any)); return; }
      if (url.pathname === "/api/vocoder" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.vocoderGen(body as any)); return; }
      if (url.pathname === "/api/noisefx" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.noiseFxGen(body as any)); return; }
      if (url.pathname === "/api/cymbal" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.cymbalGen(body as any)); return; }
      if (url.pathname === "/api/guitar" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.guitarGen(body as any)); return; }
      if (url.pathname === "/api/sitar" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.sitarGen(body as any)); return; }
      if (url.pathname === "/api/steeldrum" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.steelDrumGen(body as any)); return; }
      if (url.pathname === "/api/accordion" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.accordionGen(body as any)); return; }
      if (url.pathname === "/api/theremin" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.thereminGen(body as any)); return; }
      if (url.pathname === "/api/hihat808" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.hiHat808Gen(body as any)); return; }
      if (url.pathname === "/api/stabhit" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.stabHitGen(body as any)); return; }
      if (url.pathname === "/api/glassbell" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.glassBellGen(body as any)); return; }
      if (url.pathname === "/api/subkick" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.subKickGen(body as any)); return; }
      if (url.pathname === "/api/reversesweep" && method === "POST") { const body = await parseBody(req); sendJson(res, 200, await bridge.reverseSweepGen(body as any)); return; }
      if (url.pathname === "/api/audioout" && method === "GET") {
        const buf = bridge.servedAudio(url.searchParams.get("id") || "");
        if (!buf) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": String(buf.length) }); res.end(buf);
        return;
      }
      if (url.pathname === "/api/warpaudio" && method === "GET") {
        const buf = bridge.warpAudio(url.searchParams.get("id") || "");
        if (!buf) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": String(buf.length) }); res.end(buf);
        return;
      }
      if (url.pathname === "/api/config" && method === "POST") {
        const body = await parseBody(req);
        if (body.provider) config.provider = body.provider as string;
        if (body.apiKey) config.apiKey = body.apiKey as string;
        if (body.model) config.model = body.model as string;
        sendJson(res, 200, { success: true, config: { provider: config.provider, model: config.model, hasKey: !!config.apiKey } });
        return;
      }
      if (url.pathname === "/api/config" && method === "GET") {
        sendJson(res, 200, { config: { provider: config.provider, model: config.model, hasKey: !!config.apiKey } });
        return;
      }
      if (url.pathname === "/api/chat" && method === "POST") {
        const body = await parseBody(req);
        const provider = (body.provider as string) || config.provider;
        const apiKey = (body.apiKey as string) || config.apiKey;
        const model = (body.model as string) || config.model;
        if (!apiKey) { sendJson(res, 400, { success: false, error: "Falta API key. Configúrala en el panel de Copiloto." }); return; }
        const client: LLMClient = createLLMClient(provider, apiKey, model);
        const result = body.mode === "plan"
          ? await bridge.processPlan({ messages: (body.messages as any) || [] }, client)
          : await bridge.processChat({ messages: (body.messages as any) || [] }, client);
        sendJson(res, 200, { success: true, ...result });
        return;
      }
      if (url.pathname === "/health") { sendJson(res, 200, { status: "ok" }); return; }

      // ---- Static ----
      const rel = url.pathname === "/" ? "/index.html" : url.pathname;
      const full = path.join(UI_DIR, rel);
      if (!full.startsWith(UI_DIR)) { res.writeHead(403); res.end("Forbidden"); return; }
      const content = fs.readFileSync(full);
      res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "text/plain" });
      res.end(content);
    } catch (err: any) {
      if (res.headersSent) { try { res.end(); } catch { /* already ended */ } return; }
      if (err && err.code === "ENOENT") { res.writeHead(404); res.end("Not found"); return; }
      sendJson(res, 500, { success: false, error: err?.message || "Internal error" });
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = addr && typeof addr === "object" ? addr.port : 0;
      console.log(`[LiveStudio] Server on http://127.0.0.1:${port}`);
      resolve({ url: `http://127.0.0.1:${port}`, port, close: () => new Promise((r) => {
        // SSE connections are long-lived by design; end them explicitly or server.close() never fires.
        if (poller) { clearInterval(poller); poller = null; }
        for (const c of sseClients) { try { c.end(); } catch { /* already gone */ } }
        sseClients.clear();
        server.close(() => r());
      }) });
    });
  });
}
