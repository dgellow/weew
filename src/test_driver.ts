// TestDriver - headless app driver for testing without a real terminal

import { Canvas } from "./canvas.ts";
import type { Component, Rect } from "./components.ts";
import type { AppConfig, RunControl } from "./run.ts";
import type { RenderContext } from "./screen.ts";
import type { KeyEvent } from "./input.ts";
import type { TerminalSize } from "./terminal.ts";

/**
 * Headless driver for testing weew apps without a real terminal.
 * Accepts the same RunConfig as run() but runs without terminal I/O.
 */
export class TestDriver {
  private _canvas: Canvas;
  private _running = true;
  private _needsRender = true;
  private _width: number;
  private _height: number;
  private config: Required<AppConfig>;
  private readonly ctx: RunControl;

  constructor(config: AppConfig, width = 80, height = 24) {
    this.config = {
      render: config.render,
      onKey: config.onKey ?? (() => {}),
      onTick: config.onTick ?? (() => {}),
      tickInterval: config.tickInterval ?? 16,
      altScreen: config.altScreen ?? true,
      hideCursor: config.hideCursor ?? true,
      onResize: config.onResize ?? (() => {}),
    };

    this._width = width;
    this._height = height;
    this._canvas = new Canvas(width, height);

    this.ctx = {
      render: () => {
        this._needsRender = true;
        this.renderFrame();
      },
      exit: () => {
        this._running = false;
      },
      size: () => ({ columns: this._width, rows: this._height }),
    };

    // Initial render
    this.renderFrame();
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
    this.config.onKey(event, this.ctx);
    this._needsRender = true;
    this.renderFrame();
  }

  /** Advance time (triggers onTick) */
  tick(deltaMs = 16): void {
    this.config.onTick(deltaMs, this.ctx);
    this._needsRender = true;
    this.renderFrame();
  }

  /** Simulate terminal resize */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this._canvas.resize(width, height);

    const size: TerminalSize = { columns: width, rows: height };
    this.config.onResize(size);
    this._needsRender = true;
    this.renderFrame();
  }

  /** Send multiple keys in sequence */
  sendKeys(...keys: string[]): void {
    for (const k of keys) {
      this.sendKey(k);
    }
  }

  /** Send each character of a string as individual key events */
  type(text: string): void {
    for (const ch of text) {
      this.sendKey(ch);
    }
  }

  /** Force a render and return screen as text */
  render(): string {
    this._needsRender = true;
    this.renderFrame();
    return this.text;
  }

  /** Stop the app */
  exit(): void {
    this._running = false;
  }

  private renderFrame(): void {
    if (!this._needsRender) return;
    this._needsRender = false;

    this._canvas.clear();

    const renderCtx: RenderContext = {
      width: this._width,
      height: this._height,
    };

    const root: Component = this.config.render(renderCtx);
    const rect: Rect = {
      x: 0,
      y: 0,
      width: this._width,
      height: this._height,
    };

    root.render(this._canvas, rect);
  }
}
