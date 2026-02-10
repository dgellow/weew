// Canvas - a 2D buffer for efficient terminal rendering

import { charWidth, cursor, stripAnsi, style } from "./ansi.ts";
import { getSize, write } from "./terminal.ts";

interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Cell {
  char: string;
  fg?: string;
  bg?: string;
  style?: string;
}

export class Canvas {
  private bufferA: Cell[][];
  private bufferB: Cell[][];
  private buffer: Cell[][];
  private prevBuffer: Cell[][] | null = null;
  private clipStack: ClipRect[] = [];
  width: number;
  height: number;

  constructor(width?: number, height?: number) {
    const size = getSize();
    this.width = width ?? size.columns;
    this.height = height ?? size.rows;
    this.bufferA = this.createBuffer();
    this.bufferB = this.createBuffer();
    this.buffer = this.bufferA;
  }

  private createBuffer(): Cell[][] {
    return Array.from(
      { length: this.height },
      () => Array.from({ length: this.width }, () => ({ char: " " })),
    );
  }

  /** Clear the buffer in-place */
  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.buffer[y][x];
        cell.char = " ";
        cell.fg = undefined;
        cell.bg = undefined;
        cell.style = undefined;
      }
    }
  }

  /** Resize the canvas and clear buffers */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.bufferA = this.createBuffer();
    this.bufferB = this.createBuffer();
    this.buffer = this.bufferA;
    this.prevBuffer = null;
  }

  /** Push a clip region onto the stack */
  pushClip(rect: ClipRect): void {
    this.clipStack.push(rect);
  }

  /** Pop the top clip region from the stack */
  popClip(): void {
    this.clipStack.pop();
  }

  /** Set a cell at position */
  set(x: number, y: number, cell: Cell): void {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (this.clipStack.length > 0) {
      const clip = this.clipStack[this.clipStack.length - 1];
      if (
        xi < clip.x || xi >= clip.x + clip.width ||
        yi < clip.y || yi >= clip.y + clip.height
      ) return;
    }
    if (xi >= 0 && xi < this.width && yi >= 0 && yi < this.height) {
      this.buffer[yi][xi] = cell;
    }
  }

  /** Get a cell at position */
  get(x: number, y: number): Cell | undefined {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi >= 0 && xi < this.width && yi >= 0 && yi < this.height) {
      return this.buffer[yi][xi];
    }
    return undefined;
  }

  /** Write text at position (handles wide characters like emoji/CJK) */
  text(
    x: number,
    y: number,
    text: string,
    options?: { fg?: string; bg?: string; style?: string },
  ): void {
    const stripped = stripAnsi(text);
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let col = 0;
    for (const char of stripped) {
      const width = charWidth(char);
      if (width === 0) continue; // Skip zero-width characters

      this.set(xi + col, yi, {
        char: char,
        fg: options?.fg,
        bg: options?.bg,
        style: options?.style,
      });

      // For wide characters, fill the next cell with empty placeholder
      if (width === 2) {
        this.set(xi + col + 1, yi, {
          char: "", // Empty - cursor will skip this
          fg: options?.fg,
          bg: options?.bg,
        });
      }

      col += width;
    }
  }

  /** Draw a horizontal line */
  hline(
    x: number,
    y: number,
    length: number,
    char = "─",
    options?: { fg?: string; bg?: string },
  ): void {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const len = Math.floor(length);
    for (let i = 0; i < len; i++) {
      this.set(xi + i, yi, { char, fg: options?.fg, bg: options?.bg });
    }
  }

  /** Draw a vertical line */
  vline(
    x: number,
    y: number,
    length: number,
    char = "│",
    options?: { fg?: string; bg?: string },
  ): void {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const len = Math.floor(length);
    for (let i = 0; i < len; i++) {
      this.set(xi, yi + i, { char, fg: options?.fg, bg: options?.bg });
    }
  }

  /** Fill a rectangle */
  fill(
    x: number,
    y: number,
    width: number,
    height: number,
    char = " ",
    options?: { fg?: string; bg?: string },
  ): void {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const w = Math.floor(width);
    const h = Math.floor(height);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(xi + dx, yi + dy, { char, fg: options?.fg, bg: options?.bg });
      }
    }
  }

  /** Render to terminal with diff-based updates */
  render(): void {
    const parts: string[] = [];
    let penX = -1, penY = -1;
    let curStyle: string | undefined,
      curFg: string | undefined,
      curBg: string | undefined;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.buffer[y][x];
        const prev = this.prevBuffer?.[y]?.[x];

        // Skip empty placeholder cells (second half of wide characters)
        if (cell.char === "") continue;

        // Skip if cell hasn't changed
        if (
          prev &&
          prev.char === cell.char &&
          prev.fg === cell.fg &&
          prev.bg === cell.bg &&
          prev.style === cell.style
        ) {
          continue;
        }

        // Reposition cursor if needed
        if (penX !== x || penY !== y) {
          if (parts.length > 0) parts.push(style.reset);
          parts.push(cursor.to(x, y));
          curStyle = curFg = curBg = undefined;
        }

        // Only emit style codes when they change
        if (
          cell.style !== curStyle || cell.fg !== curFg || cell.bg !== curBg
        ) {
          parts.push(style.reset);
          if (cell.style) parts.push(cell.style);
          if (cell.fg) parts.push(cell.fg);
          if (cell.bg) parts.push(cell.bg);
          curStyle = cell.style;
          curFg = cell.fg;
          curBg = cell.bg;
        }

        parts.push(cell.char);
        penX = x + (charWidth(cell.char) > 1 ? 2 : 1);
        penY = y;
      }
    }

    if (parts.length > 0) {
      parts.push(style.reset);
      write(parts.join(""));
    }

    // Swap buffers
    this.prevBuffer = this.buffer;
    this.buffer = this.buffer === this.bufferA ? this.bufferB : this.bufferA;
  }

  /** Force full redraw (ignores diff) */
  fullRender(): void {
    this.prevBuffer = null;
    this.render();
  }
}
