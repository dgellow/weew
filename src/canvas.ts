// Canvas - a 2D buffer for efficient terminal rendering

import { cursor, style, stripAnsi } from "./ansi.ts";
import { getSize, write } from "./terminal.ts";

export interface Cell {
  char: string;
  fg?: string;
  bg?: string;
  style?: string;
}

export class Canvas {
  private buffer: Cell[][];
  private prevBuffer: Cell[][] | null = null;
  width: number;
  height: number;

  constructor(width?: number, height?: number) {
    const size = getSize();
    this.width = width ?? size.columns;
    this.height = height ?? size.rows;
    this.buffer = this.createBuffer();
  }

  private createBuffer(): Cell[][] {
    return Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({ char: " " }))
    );
  }

  /** Clear the buffer */
  clear(): void {
    this.buffer = this.createBuffer();
  }

  /** Resize the canvas and clear buffers */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.buffer = this.createBuffer();
    this.prevBuffer = null;
  }

  /** Set a cell at position */
  set(x: number, y: number, cell: Cell): void {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
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

  /** Write text at position */
  text(
    x: number,
    y: number,
    text: string,
    options?: { fg?: string; bg?: string; style?: string }
  ): void {
    const stripped = stripAnsi(text);
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    for (let i = 0; i < stripped.length; i++) {
      this.set(xi + i, yi, {
        char: stripped[i],
        fg: options?.fg,
        bg: options?.bg,
        style: options?.style,
      });
    }
  }

  /** Draw a horizontal line */
  hline(x: number, y: number, length: number, char = "─", options?: { fg?: string; bg?: string }): void {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const len = Math.floor(length);
    for (let i = 0; i < len; i++) {
      this.set(xi + i, yi, { char, fg: options?.fg, bg: options?.bg });
    }
  }

  /** Draw a vertical line */
  vline(x: number, y: number, length: number, char = "│", options?: { fg?: string; bg?: string }): void {
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
    options?: { fg?: string; bg?: string }
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
    let output = "";

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.buffer[y][x];
        const prevCell = this.prevBuffer?.[y]?.[x];

        // Skip if cell hasn't changed
        if (
          prevCell &&
          prevCell.char === cell.char &&
          prevCell.fg === cell.fg &&
          prevCell.bg === cell.bg &&
          prevCell.style === cell.style
        ) {
          continue;
        }

        // Move cursor and write cell
        output += cursor.to(x, y);
        if (cell.style) output += cell.style;
        if (cell.fg) output += cell.fg;
        if (cell.bg) output += cell.bg;
        output += cell.char;
        output += style.reset;
      }
    }

    if (output) {
      write(output);
    }

    // Save current buffer as previous
    this.prevBuffer = this.buffer.map(row => row.map(cell => ({ ...cell })));
  }

  /** Force full redraw (ignores diff) */
  fullRender(): void {
    this.prevBuffer = null;
    this.render();
  }
}
