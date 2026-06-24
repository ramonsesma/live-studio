import { initialize } from "@ableton-extensions/sdk";
import type { ActivationContext } from "@ableton-extensions/sdk";
import { createMasterRegistry } from "./registry/index.js";
import { Bridge } from "./bridge.js";
import { startServer, type AppServer } from "./server.js";

let currentServer: AppServer | null = null;
let bridge: Bridge | null = null;

// Right-click targets where the "Live Studio" action appears. ClipSlot covers the
// (empty) Session-view grid cells, the most common right-click target.
const MENU_SCOPES = ["AudioTrack", "MidiTrack", "ClipSlot", "AudioClip", "MidiClip", "Scene"] as const;

// The host calls the named export `activate` and awaits it, so it returns promptly and
// opens NO window — auto-opening a modal on every Live launch is intrusive. We register
// a command + context-menu actions FIRST (so the menu entry always appears even if the
// registry/server were to fail), and build the registry + start the local server lazily
// the first time the user opens the UI (right-click a track / clip / scene → "Live Studio").
export function activate(context: ActivationContext) {
  const ctx = initialize(context, "1.0.0");

  const openUI = () => {
    void (async () => {
      try {
        if (!bridge) bridge = new Bridge(createMasterRegistry(), ctx.application.song, ctx.resources, ctx.environment);
        if (!currentServer) currentServer = await startServer(bridge);
        await ctx.ui.showModalDialog(`${currentServer.url}/`, 1100, 820);
      } catch (err) {
        console.error("[LiveStudio] Failed to open:", err);
      }
    })();
  };

  ctx.commands.registerCommand("livestudio.open", openUI);

  for (const scope of MENU_SCOPES) {
    ctx.ui
      .registerContextMenuAction(scope as never, "Live Studio", "livestudio.open")
      .then(() => console.error(`[LiveStudio] context action registered: ${scope}`))
      .catch((e: unknown) => console.error(`[LiveStudio] context action FAILED (${scope}):`, e));
  }
  console.error("[LiveStudio] Ready — right-click a track, clip slot, clip or scene → “Live Studio”.");
}
