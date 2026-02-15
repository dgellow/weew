// TestDriver - headless app driver for testing without a real terminal

import { Canvas } from "./canvas.ts";
import type { Component, Rect } from "./components.ts";
import type { AppConfig, AppContext, RenderContext } from "./app.ts";
import type { KeyEvent } from "./input.ts";
import type { TerminalSize } from "./terminal.ts";

/**
 * Headless driver for testing weew apps without a real terminal.
 * Runs the same state machine as App but without terminal I/O.
 */
export class TestDriver<S> {
  private _state: S;
  private _canvas: Canvas;
  private _running = true;
  private _needsRender = true;
  private _width: number;
  private _height: number;
  private config: Required<AppConfig<S>>;
  private readonly ctx: AppContext<S>;

  constructor(config: AppConfig<S>, width = 80, height = 24) {
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

    this._state = this.config.initialState;
    this._width = width;
    this._height = height;
    this._canvas = new Canvas(width, height);

    this.ctx = {
      render: () => {
        this._needsRender = true;
      },
      setState: (newState: S | ((s: S) => S)) => {
        if (typeof newState === "function") {
          this._state = (newState as (s: S) => S)(this._state);
        } else {
          this._state = newState;
        }
        this._needsRender = true;
      },
      exit: () => {
        this._running = false;
      },
      size: () => ({ columns: this._width, rows: this._height }),
    };

    // Initial render
    this.renderFrame();
  }

  /** Current app state */
  get state(): S {
    return this._state;
  }

  /** Current canvas */
  get screen(): Canvas {
    return this._canvas;
  }

  /** Get screen as plain text */
  get text(): string {
    return this._canvas.toString();
  }

  /** Whether the app is still running */
  get running(): boolean {
    return this._running;
  }

  /** Send a key event */
  sendKey(
    key: string,
    modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean },
  ): void {
    const event: KeyEvent = {
      key,
      ctrl: modifiers?.ctrl ?? false,
      alt: modifiers?.alt ?? false,
      shift: modifiers?.shift ?? false,
      meta: false,
      raw: new Uint8Array(0),
    };
    this.sendKeyEvent(event);
  }

  /** Send a raw KeyEvent */
  sendKeyEvent(event: KeyEvent): void {
    const newState = this.config.onKey(event, this._state, this.ctx);
    if (newState !== undefined) {
      this._state = newState;
      this._needsRender = true;
    }
    this.renderFrame();
  }

  /** Advance time (triggers onTick) */
  tick(deltaMs = 16): void {
    const newState = this.config.onTick(this._state, deltaMs, this.ctx);
    if (newState !== undefined) {
      this._state = newState;
      this._needsRender = true;
    }
    this.renderFrame();
  }

  /** Simulate terminal resize */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this._canvas.resize(width, height);

    const size: TerminalSize = { columns: width, rows: height };
    const newState = this.config.onResize(size, this._state, this.ctx);
    if (newState !== undefined) {
      this._state = newState;
    }
    this._needsRender = true;
    this.renderFrame();
  }

  /** Force a render and return screen as text */
  render(): string {
    this._needsRender = true;
    this.renderFrame();
    return this.text;
  }

  private renderFrame(): void {
    if (!this._needsRender) return;
    this._needsRender = false;

    this._canvas.clear();

    const renderCtx: RenderContext = {
      width: this._width,
      height: this._height,
    };

    const root: Component = this.config.render(this._state, renderCtx);
    const rect: Rect = {
      x: 0,
      y: 0,
      width: this._width,
      height: this._height,
    };

    root.render(this._canvas, rect);
  }
}
