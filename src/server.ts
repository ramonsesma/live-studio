import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
// Import URL/URLSearchParams explicitly: the Live Extension Host runs the extension
// in a context that does NOT expose Node's WHATWG globals (URL was "not defined" at
// runtime), so we must pull them from node:url rather than rely on the global.
import { fileURLToPath, URL } from "node:url";
import { Bridge } from "./bridge.js";
import { createLLMClient, type LLMClient } from "./core/llm.js";

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
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function startServer(bridge: Bridge): Promise<AppServer> {
  const config: Config = { provider: "openrouter", apiKey: "", model: "" };

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
      if (url.pathname === "/api/execute" && method === "POST") {
        const body = await parseBody(req);
        const result = await bridge.executeTool(body.name as string, (body.args as Record<string, unknown>) || {});
        sendJson(res, 200, result);
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
        const result = await bridge.processChat({ messages: (body.messages as any) || [] }, client);
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
      if (err && err.code === "ENOENT") { res.writeHead(404); res.end("Not found"); return; }
      sendJson(res, 500, { success: false, error: err?.message || "Internal error" });
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = addr && typeof addr === "object" ? addr.port : 0;
      console.error(`[LiveStudio] Server on http://127.0.0.1:${port}`);
      resolve({ url: `http://127.0.0.1:${port}`, port, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}
