/**
 * run() — convenience wrapper around Screen for callback-style apps.
 * For full control, use Screen directly.
 */

import { Canvas } from "./canvas.ts";
import type { Component } from "./components.ts";
import type { KeyEvent } from "./input.ts";
import { type RenderContext, Screen, type ScreenIO } from "./screen.ts";
import type { TerminalSize } from "./terminal.ts";

/** App logic configuration — render, key handling, tick, resize. Runtime-agnostic. */
export interface AppConfig {
  /** Return the current UI. Called after every event and on explicit render request. */
  render: (ctx: RenderContext) => Component;
  /** Key handler — mutate your own state, call ctrl.render() for async updates. */
  onKey?: (event: KeyEvent, ctrl: RunControl) => void;
  /** Tick handler for animations. Starts a tick loop at tickInterval. Without this, no tick loop runs. */
  onTick?: (delta: number, ctrl: RunControl) => void;
  /** Tick interval in ms (default: 16 ~60fps). Only used when onTick is provided. */
  tickInterval?: number;
  /** Use alternate screen buffer (default: true) */
  altScreen?: boolean;
  /** Hide cursor (default: true) */
  hideCursor?: boolean;
  /** Handle resize */
  onResize?: (size: TerminalSize) => void;
}

/** Configuration for run(). Combines app logic with runtime I/O. */
export interface RunConfig extends AppConfig {
  /** Terminal I/O implementation. Use denoTerminalIO() for Deno, TestScreenIO for tests. */
  io: ScreenIO;
}

/** Control handle passed to run() callbacks for managing the event loop. */
export interface RunControl {
  /**
   * Trigger an immediate re-render. Sync handlers (onKey, onTick) auto-render
   * after returning, so you only need this for async updates.
   *
   * @example
   * ```ts
   * let loading = false;
   * let data = "";
   *
   * await run({
   *   render: () => Text(loading ? "Loading..." : data),
   *   onKey: (event, ctrl) => {
   *     if (event.key === "Enter") {
   *       loading = true;
   *       fetchData().then((d) => {
   *         data = d;
   *         loading = false;
   *         ctrl.render();
   *       });
   *     }
   *   },
   * });
   * ```
   */
  render: () => void;
  /** Exit and restore terminal. */
  exit: () => void;
  /** Get current terminal size. */
  size: () => TerminalSize;
}

/**
 * Run a callback-style app with an event loop.
 * Sugar over Screen — creates a Screen internally, runs the event loop,
 * and dispatches events to the provided handlers.
 *
 * For full control over the event loop, use Screen directly.
 */
export async function run(config: RunConfig): Promise<void> {
  using screen = new Screen({
    io: config.io,
    altScreen: config.altScreen,
    hideCursor: config.hideCursor,
  });

  let running = true;
  let needsRender = true;

  const ctrl: RunControl = {
    render: () => {
      needsRender = true;
      doRender();
    },
    exit: () => {
      running = false;
      screen.close();
    },
    size: () => ({ columns: screen.width, rows: screen.height }),
  };

  function doRender(): void {
    if (!needsRender) return;
    needsRender = false;
    screen.draw(config.render);
  }

  // Start tick loop only if onTick provided
  let tickTimer: number | null = null;
  if (config.onTick) {
    let lastTick = performance.now();
    const interval = config.tickInterval ?? 16;
    const tick = (): void => {
      if (!running) return;
      const now = performance.now();
      config.onTick!(now - lastTick, ctrl);
      lastTick = now;
      needsRender = true;
      doRender();
      if (running) tickTimer = setTimeout(tick, interval);
    };
    tick();
  }

  // Initial render
  doRender();

  try {
    for await (const event of screen.events()) {
      if (!running) break;
      if (event.type === "resize") {
        config.onResize?.({ columns: event.columns, rows: event.rows });
      } else {
        config.onKey?.(event, ctrl);
      }
      needsRender = true;
      doRender();
    }
  } finally {
    if (tickTimer !== null) clearTimeout(tickTimer);
  }
}

/** Render a component once without any interactivity or event loop. */
export function renderOnce(component: Component, io: ScreenIO): void {
  const size = io.size();
  const canvas = new Canvas(size.columns, size.rows);

  component.render(canvas, {
    x: 0,
    y: 0,
    width: size.columns,
    height: size.rows,
  });

  io.flush(canvas);
}
