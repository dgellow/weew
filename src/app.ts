// App - the main application runner with state management

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

export interface AppConfig<S> {
  /** Initial state */
  initialState: S;
  /** Render function - returns the UI based on current state */
  render: (state: S, ctx: RenderContext) => Component;
  /** Key handler - return new state or undefined to keep current */
  onKey?: (
    event: KeyEvent,
    state: S,
    ctx: AppContext<S>,
  ) => S | undefined | void;
  /** Tick handler for animations - return new state */
  onTick?: (
    state: S,
    delta: number,
    ctx: AppContext<S>,
  ) => S | undefined | void;
  /** Tick interval in ms (default: 16 ~60fps) */
  tickInterval?: number;
  /** Use alternate screen buffer (default: true) */
  altScreen?: boolean;
  /** Hide cursor (default: true) */
  hideCursor?: boolean;
  /** Handle resize */
  onResize?: (
    size: TerminalSize,
    state: S,
    ctx: AppContext<S>,
  ) => S | undefined | void;
}

export interface RenderContext {
  width: number;
  height: number;
}

export interface AppContext<S> {
  /** Request a re-render */
  render: () => void;
  /** Update state and re-render */
  setState: (newState: S | ((s: S) => S)) => void;
  /** Exit the app */
  exit: () => void;
  /** Get current terminal size */
  size: () => TerminalSize;
}

export class App<S> {
  private state: S;
  private canvas: Canvas;
  private keyboard: KeyboardInput;
  private running = false;
  private needsRender = true;
  private config: Required<AppConfig<S>>;
  private lastTick = 0;
  private tickTimer: number | null = null;
  private removeResizeHandler: (() => void) | null = null;

  constructor(config: AppConfig<S>) {
    this.config = {
      initialState: config.initialState,
      render: config.render,
      onKey: config.onKey ?? (() => undefined),
      onTick: config.onTick ?? (() => undefined),
      tickInterval: config.tickInterval ?? 16,
      altScreen: config.altScreen ?? true,
      hideCursor: config.hideCursor ?? true,
      onResize: config.onResize ?? (() => undefined),
    };

    this.state = this.config.initialState;
    const size = getSize();
    this.canvas = new Canvas(size.columns, size.rows);
    this.keyboard = new KeyboardInput();
  }

  private readonly ctx: AppContext<S> = {
    render: () => {
      this.needsRender = true;
    },
    setState: (newState) => {
      if (typeof newState === "function") {
        this.state = (newState as (s: S) => S)(this.state);
      } else {
        this.state = newState;
      }
      this.needsRender = true;
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

    const root = this.config.render(this.state, {
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

  private handleKey = (event: KeyEvent): void => {
    const newState = this.config.onKey(event, this.state, this.ctx);
    if (newState !== undefined) {
      this.state = newState;
      this.needsRender = true;
    }
  };

  private handleTick = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastTick;
    this.lastTick = now;

    const newState = this.config.onTick(this.state, delta, this.ctx);
    if (newState !== undefined) {
      this.state = newState;
      this.needsRender = true;
    }

    this.renderFrame();

    if (this.running) {
      this.tickTimer = setTimeout(this.handleTick, this.config.tickInterval);
    }
  };

  private handleResize = (): void => {
    const size = getSize();
    this.canvas.resize(size.columns, size.rows);

    const newState = this.config.onResize(size, this.state, this.ctx);
    if (newState !== undefined) {
      this.state = newState;
    }

    this.needsRender = true;
    this.renderFrame();
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

    // Start tick loop
    this.lastTick = performance.now();
    this.handleTick();

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

/** Convenient run function */
export function run<S>(config: AppConfig<S>): Promise<void> {
  const app = new App(config);
  return app.run();
}

/** Simple static render (no interactivity, just render once) */
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
