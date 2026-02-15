/**
 * Screen — low-level terminal session primitive.
 * Manages terminal lifecycle (alt screen, raw mode, cursor),
 * provides a draw() method for rendering, and an events() async
 * generator for unified key + resize events.
 *
 * Accepts an injectable ScreenIO for testability. Defaults to real terminal.
 */

import { Canvas } from "./canvas.ts";
import type { Component, Rect } from "./components.ts";
import { type KeyEvent, keyEvents } from "./input.ts";
/** Context passed to the render function with current terminal dimensions. */
export interface RenderContext {
  width: number;
  height: number;
}
import {
  clearScreen,
  enterAltScreen,
  exitAltScreen,
  getSize,
  hideCursor as termHideCursor,
  onResize,
  setRawMode,
  showCursor as termShowCursor,
} from "./terminal.ts";

/** Configuration for creating a Screen. */
export interface ScreenConfig {
  /** Use alternate screen buffer (default: true) */
  altScreen?: boolean;
  /** Hide cursor (default: true) */
  hideCursor?: boolean;
  /** Injectable I/O for testing. Defaults to real terminal. */
  io?: ScreenIO;
}

/**
 * I/O interface for Screen. Implement this to test Screen-based apps
 * without a real terminal, or to target alternative outputs (e.g. SSH, web).
 */
export interface ScreenIO {
  /** Get current terminal size. */
  size(): { columns: number; rows: number };
  /** Set up terminal (alt screen, raw mode, cursor, clear). */
  setup(altScreen: boolean, hideCursor: boolean): void;
  /** Restore terminal state. */
  teardown(altScreen: boolean, hideCursor: boolean): void;
  /** Write rendered canvas to output. */
  flush(canvas: Canvas): void;
  /** Yield key and resize events until close() is called. */
  events(): AsyncGenerator<ScreenEvent>;
  /** Close input source to stop events(). */
  close(): void;
}

/** A key event from the terminal. */
export type KeyScreenEvent = KeyEvent & { type: "key" };

/** A resize event from the terminal. */
export interface ResizeScreenEvent {
  type: "resize";
  columns: number;
  rows: number;
}

/** Events yielded by Screen.events(). */
export type ScreenEvent = KeyScreenEvent | ResizeScreenEvent;

/** Default ScreenIO that uses the real terminal. */
function terminalIO(): ScreenIO {
  return {
    size: getSize,

    setup(altScreen: boolean, hideCursor: boolean): void {
      if (altScreen) enterAltScreen();
      if (hideCursor) termHideCursor();
      setRawMode(true);
      clearScreen();
    },

    teardown(altScreen: boolean, hideCursor: boolean): void {
      setRawMode(false);
      if (hideCursor) termShowCursor();
      if (altScreen) exitAltScreen();
    },

    flush(canvas: Canvas): void {
      canvas.render();
    },

    async *events(): AsyncGenerator<ScreenEvent> {
      const queue: ScreenEvent[] = [];
      let wakeup: (() => void) | null = null;

      const notify = () => {
        wakeup?.();
      };

      const removeResize = onResize((size) => {
        queue.push({
          type: "resize",
          columns: size.columns,
          rows: size.rows,
        });
        notify();
      });

      let keyReaderDone = false;
      const keyReaderPromise = (async () => {
        for await (const event of keyEvents()) {
          queue.push({ ...event, type: "key" as const });
          notify();
        }
        keyReaderDone = true;
        notify();
      })();

      try {
        while (!keyReaderDone) {
          while (queue.length > 0) {
            yield queue.shift()!;
          }
          if (keyReaderDone) break;
          await new Promise<void>((resolve) => {
            wakeup = resolve;
          });
          wakeup = null;
        }
        while (queue.length > 0) {
          yield queue.shift()!;
        }
      } finally {
        removeResize();
        await keyReaderPromise.catch(() => {});
      }
    },

    close(): void {
      try {
        Deno.stdin.close();
      } catch {
        // Ignore if already closed
      }
    },
  };
}

/**
 * Low-level terminal session. Manages terminal setup/teardown,
 * provides canvas-based drawing, and a unified event stream.
 *
 * Pass a custom `io` in ScreenConfig for testing without a real terminal.
 *
 * @example
 * ```ts
 * using screen = new Screen();
 *
 * screen.draw(() => Text("Hello!"));
 *
 * for await (const event of screen.events()) {
 *   if (event.type === "key" && isKey(event, "q")) break;
 *   screen.draw(() => Text("Hello!"));
 * }
 * ```
 */
export class Screen {
  readonly canvas: Canvas;
  private closed = false;
  private readonly altScreen: boolean;
  private readonly hideCursor: boolean;
  private readonly io: ScreenIO;

  constructor(config?: ScreenConfig) {
    this.altScreen = config?.altScreen ?? true;
    this.hideCursor = config?.hideCursor ?? true;
    this.io = config?.io ?? terminalIO();

    const size = this.io.size();
    this.canvas = new Canvas(size.columns, size.rows);

    this.io.setup(this.altScreen, this.hideCursor);
  }

  /** Terminal width in columns. */
  get width(): number {
    return this.canvas.width;
  }

  /** Terminal height in rows. */
  get height(): number {
    return this.canvas.height;
  }

  /**
   * Clear canvas, call the render function, and flush to output.
   * @param render - Function that returns the root component to draw
   */
  draw(render: (ctx: RenderContext) => Component): void {
    const size = this.io.size();
    if (
      size.columns !== this.canvas.width || size.rows !== this.canvas.height
    ) {
      this.canvas.resize(size.columns, size.rows);
    }

    this.canvas.clear();

    const ctx: RenderContext = {
      width: this.canvas.width,
      height: this.canvas.height,
    };

    const root: Component = render(ctx);
    const rect: Rect = {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
    };

    root.render(this.canvas, rect);
    this.io.flush(this.canvas);
  }

  /**
   * Async generator yielding key and resize events.
   * Yields until close() is called or the input source closes.
   */
  async *events(): AsyncGenerator<ScreenEvent> {
    for await (const event of this.io.events()) {
      if (this.closed) break;
      if (event.type === "resize") {
        this.canvas.resize(event.columns, event.rows);
      }
      yield event;
    }
  }

  /**
   * Restore terminal state. Safe to call multiple times.
   * Closes input source to unblock any pending reads in events().
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;

    this.io.close();
    this.io.teardown(this.altScreen, this.hideCursor);
  }

  /** Dispose support for `using screen = new Screen()`. */
  [Symbol.dispose](): void {
    this.close();
  }
}

/**
 * Headless ScreenIO for testing. Push events manually,
 * canvas state is readable via screen.canvas.toString().
 *
 * @example
 * ```ts
 * const io = new TestScreenIO(80, 24);
 * const screen = new Screen({ io });
 *
 * screen.draw(() => Text("Hello"));
 * assertEquals(screen.canvas.toString().includes("Hello"), true);
 *
 * io.push({ type: "key", key: "q", ctrl: false, alt: false, shift: false, meta: false, raw: new Uint8Array() });
 * ```
 */
export class TestScreenIO implements ScreenIO {
  private _columns: number;
  private _rows: number;
  private _closed = false;
  private queue: ScreenEvent[] = [];
  private _notify: (() => void) | null = null;

  constructor(columns = 80, rows = 24) {
    this._columns = columns;
    this._rows = rows;
  }

  size(): { columns: number; rows: number } {
    return { columns: this._columns, rows: this._rows };
  }

  setup(): void {}
  teardown(): void {}

  flush(): void {}

  /** Push an event into the stream. */
  push(event: ScreenEvent): void {
    this.queue.push(event);
    this._notify?.();
  }

  /** Push a key event. */
  pushKey(
    key: string,
    modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean },
  ): void {
    this.push({
      type: "key",
      key,
      ctrl: modifiers?.ctrl ?? false,
      alt: modifiers?.alt ?? false,
      shift: modifiers?.shift ?? false,
      meta: false,
      raw: new Uint8Array(),
    });
  }

  /** Push a resize event and update the reported size. */
  pushResize(columns: number, rows: number): void {
    this._columns = columns;
    this._rows = rows;
    this.push({ type: "resize", columns, rows });
  }

  async *events(): AsyncGenerator<ScreenEvent> {
    while (!this._closed) {
      while (this.queue.length > 0) {
        yield this.queue.shift()!;
      }
      if (this._closed) break;
      await new Promise<void>((resolve) => {
        this._notify = resolve;
      });
      this._notify = null;
    }
    // Drain remaining
    while (this.queue.length > 0) {
      yield this.queue.shift()!;
    }
  }

  close(): void {
    this._closed = true;
    this._notify?.();
  }
}
