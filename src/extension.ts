import { initialize } from "@ableton-extensions/sdk";
import type { ActivationContext } from "@ableton-extensions/sdk";
import { createMasterRegistry } from "./registry/index.js";
import { Bridge } from "./bridge.js";
import { startServer, type AppServer } from "./server.js";

let currentServer: AppServer | null = null;

// Right-click targets where the "Live Studio" action appears.
const MENU_SCOPES = ["MidiTrack", "AudioTrack", "MidiClip", "AudioClip", "Scene"] as const;

// The Live Extension Host loads the entry and calls a *named* export `activate`
// (the SDK contract). activate() returns promptly — the host awaits it during
// activation — and does NOT open any window: opening a modal on every Live launch is
// intrusive. Instead we register a command + context-menu actions, and the UI opens
// on demand (right-click a track / clip / scene → "Live Studio"). The local server is
// started lazily on first open so nothing runs visibly at startup.
export function activate(context: ActivationContext) {
  const ctx = initialize(context, "1.0.0");
  const song = ctx.application.song;

  const registry = createMasterRegistry();
  const bridge = new Bridge(registry, song);

  let opening = false;
  async function openUI() {
    if (opening) return;
    opening = true;
    try {
      if (!currentServer) {
        currentServer = await startServer(bridge);
        console.error("[LiveStudio] Server started for this session.");
      }
      await ctx.ui.showModalDialog(`${currentServer.url}/`, 1100, 820);
    } catch (err) {
      console.error("[LiveStudio] Dialog error:", err);
    } finally {
      opening = false; // keep the server alive so re-opening is instant
    }
  }

  ctx.commands.registerCommand("livestudio.open", () => { void openUI(); });
  for (const scope of MENU_SCOPES) {
    void ctx.ui.registerContextMenuAction(scope as any, "Live Studio", "livestudio.open").catch(() => {});
  }
  console.error("[LiveStudio] Ready — right-click a track, clip or scene → “Live Studio” to open.");
}
