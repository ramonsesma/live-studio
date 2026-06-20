import { initialize } from "@ableton-extensions/sdk";
import type { ActivationContext } from "@ableton-extensions/sdk";
import { createMasterRegistry } from "./registry/index.js";
import { Bridge } from "./bridge.js";
import { startServer, type AppServer } from "./server.js";

let currentServer: AppServer | null = null;

async function cleanup() {
  if (currentServer) {
    await currentServer.close();
    currentServer = null;
    console.error("[LiveStudio] Server shut down");
  }
}

export default async function activate(context: ActivationContext) {
  await cleanup();

  const ctx = initialize(context, "1.0.0");
  const song = ctx.application.song;
  console.error("[LiveStudio] Loaded — starting unified server...");

  const registry = createMasterRegistry();
  const bridge = new Bridge(registry, song);
  currentServer = await startServer(bridge);

  try {
    await ctx.ui.showModalDialog(`${currentServer.url}/`, 1100, 820);
    console.error("[LiveStudio] Dialog closed by user");
  } catch (err) {
    console.error("[LiveStudio] Dialog error:", err);
  } finally {
    await cleanup();
  }
}
