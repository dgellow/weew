/** App — the main application runner with terminal lifecycle, rendering loop, and keyboard input. */

import { Canvas } from "./canvas.ts";
import type { Component, Rect } from "./components.ts";
import { KeyboardInput, type KeyEvent } from "./input.ts";
import {
  clearScreen,
  enterAltScreen,
  exitAltScreen,
  getSize,
  hideCursor,
  onResize,
  setRawMode,
  showCursor,
  type TerminalSize,
  write,
} from "./terminal.ts";
import { cursor } from "./ansi.ts";

/** Configuration for creating an App. User owns state via closures. */
export interface AppConfig {
  /** Return the current UI. Called after every event and on explicit render request. */
  render: (ctx: RenderContext) => Component;
  /** Key handler — mutate your own state, call ctx.render() for async updates. */
  onKey?: (event: KeyEvent, ctx: AppContext) => void;
  /** Tick handler for animations. Starts a tick loop at tickInterval. Without this, no tick loop runs. */
  onTick?: (delta: number, ctx: AppContext) => void;
  /** Tick interval in ms (default: 16 ~60fps). Only used when onTick is provided. */
  tickInterval?: number;
  /** Use alternate screen buffer (default: true) */
  altScreen?: boolean;
  /** Hide cursor (default: true) */
  hideCursor?: boolean;
  /** Handle resize */
  onResize?: (size: TerminalSize) => void;
}

/** Context passed to the render function with current terminal dimensions. */
export interface RenderContext {
  width: number;
  height: number;
}

/** Context available to event handlers for controlling app lifecycle. */
export interface AppContext {
  /** Trigger a re-render. Use this for async updates (fetch, timers). Sync handlers auto-render. */
  render: () => void;
  /** Exit the app */
  exit: () => void;
  /** Get current terminal size */
  size: () => TerminalSize;
}

/**
 * Main application class. Manages the terminal lifecycle (alt screen, raw mode, cursor),
 * reads keyboard input, and optionally runs a tick loop for animations.
 */
export class App {
  private canvas: Canvas;
  private keyboard: KeyboardInput;
  private running = false;
  private needsRender = true;
  private config: Required<AppConfig>;
  private hasOnTick: boolean;
  private lastTick = 0;
  private tickTimer: number | null = null;
  private removeResizeHandler: (() => void) | null = null;

  constructor(config: AppConfig) {
    this.hasOnTick = config.onTick !== undefined;
    this.config = {
      render: config.render,
      onKey: config.onKey ?? (() => {}),
      onTick: config.onTick ?? (() => {}),
      tickInterval: config.tickInterval ?? 16,
      altScreen: config.altScreen ?? true,
      hideCursor: config.hideCursor ?? true,
      onResize: config.onResize ?? (() => {}),
    };

    const size = getSize();
    this.canvas = new Canvas(size.columns, size.rows);
    this.keyboard = new KeyboardInput();
  }

  private readonly ctx: AppContext = {
    render: () => {
      this.needsRender = true;
      this.renderFrame();
    },
    exit: () => {
      this.stop();
    },
    size: () => getSize(),
  };

  private renderFrame(): void {
    if (!this.needsRender) return;
    this.needsRender = false;

    const size = getSize();
    if (
      size.columns !== this.canvas.width || size.rows !== this.canvas.height
    ) {
      this.canvas.resize(size.columns, size.rows);
    }

    this.canvas.clear();

    const root = this.config.render({
      width: this.canvas.width,
      height: this.canvas.height,
    });

    const rect: Rect = {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
    };

    root.render(this.canvas, rect);
    this.canvas.render();
  }

  private safeCleanup(): void {
    try {
      this.cleanup();
    } catch {
      // Best-effort: cleanup touches terminal I/O which could fail
    }
  }

  private handleKey = (event: KeyEvent): void => {
    try {
      this.config.onKey(event, this.ctx);
      this.needsRender = true;
      this.renderFrame();
    } catch (e) {
      this.safeCleanup();
      throw e;
    }
  };

  private handleTick = (): void => {
    if (!this.running) return;

    try {
      const now = performance.now();
      const delta = now - this.lastTick;
      this.lastTick = now;

      this.config.onTick(delta, this.ctx);
      this.needsRender = true;
      this.renderFrame();
    } catch (e) {
      this.safeCleanup();
      throw e;
    }

    if (this.running) {
      this.tickTimer = setTimeout(this.handleTick, this.config.tickInterval);
    }
  };

  private handleResize = (): void => {
    try {
      const size = getSize();
      this.canvas.resize(size.columns, size.rows);

      this.config.onResize(size);

      this.needsRender = true;
      this.renderFrame();
    } catch (e) {
      this.safeCleanup();
      throw e;
    }
  };

  async run(): Promise<void> {
    this.running = true;

    // Setup terminal
    if (this.config.altScreen) {
      enterAltScreen();
    }
    if (this.config.hideCursor) {
      hideCursor();
    }
    setRawMode(true);
    clearScreen();

    // Setup resize handler
    this.removeResizeHandler = onResize(this.handleResize);

    // Setup keyboard handler
    this.keyboard.onKey(this.handleKey);

    // Start tick loop only if onTick was provided
    if (this.hasOnTick) {
      this.lastTick = performance.now();
      this.handleTick();
    }

    // Initial render
    this.renderFrame();

    // Start keyboard loop (blocks until stopped)
    try {
      await this.keyboard.start();
    } finally {
      this.cleanup();
    }
  }

  private cleanup(): void {
    // Clear tick timer
    if (this.tickTimer !== null) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }

    // Remove resize handler
    if (this.removeResizeHandler) {
      this.removeResizeHandler();
      this.removeResizeHandler = null;
    }

    // Restore terminal
    setRawMode(false);
    if (this.config.hideCursor) {
      showCursor();
    }
    if (this.config.altScreen) {
      exitAltScreen();
    } else {
      write(cursor.to(0, this.canvas.height - 1) + "\n");
    }
  }

  stop(): void {
    this.running = false;
    this.keyboard.stop();
  }
}

/** Create and run an App with the given config. Convenience wrapper around `new App(config).run()`. */
export function run(config: AppConfig): Promise<void> {
  const app = new App(config);
  return app.run();
}

/** Render a component once to the terminal without any interactivity or event loop. */
export function renderOnce(component: Component): void {
  const size = getSize();
  const canvas = new Canvas(size.columns, size.rows);

  component.render(canvas, {
    x: 0,
    y: 0,
    width: size.columns,
    height: size.rows,
  });

  canvas.fullRender();
}
