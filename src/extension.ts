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

// The Live Extension Host loads the entry and calls a *named* export `activate`
// (the SDK contract — see the canonical key-detector/cadence-generator examples).
// A default export fails with "does not export an 'activate' function". activate()
// also returns promptly: the host awaits it during activation, so we kick off the
// server + UI as fire-and-forget instead of blocking on the dialog until it closes.
export function activate(context: ActivationContext) {
  const ctx = initialize(context, "1.0.0");
  const song = ctx.application.song;
  console.error("[LiveStudio] Loaded — starting unified server...");

  const registry = createMasterRegistry();
  const bridge = new Bridge(registry, song);

  void (async () => {
    await cleanup();
    try {
      currentServer = await startServer(bridge);
      await ctx.ui.showModalDialog(`${currentServer.url}/`, 1100, 820);
      console.error("[LiveStudio] Dialog closed by user");
    } catch (err) {
      console.error("[LiveStudio] Dialog error:", err);
    } finally {
      await cleanup();
    }
  })();
}
