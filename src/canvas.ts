/**
 * Canvas — a double-buffered 2D cell grid for efficient terminal rendering.
 * Uses flat parallel arrays for cache-friendly access and minimal GC pressure.
 * Supports dirty-region tracking for diff-based updates and a clip stack for viewport clipping.
 */

import { charWidth, cursor, stripAnsi, style } from "./ansi.ts";
import { getSize, write } from "./terminal.ts";

interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A single cell in the canvas grid, containing a character and optional styling. */
export interface Cell {
  char: string;
  fg?: string;
  bg?: string;
  style?: string;
}

/**
 * Double-buffered canvas for terminal rendering.
 * Cells are stored in flat parallel arrays (chars, fgs, bgs, styles) indexed by `y * width + x`.
 * Call `render()` to diff against the previous frame and emit only changed cells to the terminal.
 */
export class Canvas {
  // Flat parallel arrays — index = y * width + x
  private charsA: string[];
  private fgsA: (string | undefined)[];
  private bgsA: (string | undefined)[];
  private stylesA: (string | undefined)[];

  private charsB: string[];
  private fgsB: (string | undefined)[];
  private bgsB: (string | undefined)[];
  private stylesB: (string | undefined)[];

  // Active buffer references
  private chars: string[];
  private fgs: (string | undefined)[];
  private bgs: (string | undefined)[];
  private stys: (string | undefined)[];

  // Previous buffer for diffing
  private prevChars: string[] | null = null;
  private prevFgs: (string | undefined)[] | null = null;
  private prevBgs: (string | undefined)[] | null = null;
  private prevStys: (string | undefined)[] | null = null;

  private clipStack: ClipRect[] = [];

  // Dirty region tracking
  private dirtyMinX = 0;
  private dirtyMinY = 0;
  private dirtyMaxX = 0;
  private dirtyMaxY = 0;
  private hasDirty = false;

  width: number;
  height: number;

  constructor(width?: number, height?: number) {
    const size = getSize();
    this.width = width ?? size.columns;
    this.height = height ?? size.rows;
    const len = this.width * this.height;

    this.charsA = new Array<string>(len).fill(" ");
    this.fgsA = new Array<string | undefined>(len).fill(undefined);
    this.bgsA = new Array<string | undefined>(len).fill(undefined);
    this.stylesA = new Array<string | undefined>(len).fill(undefined);

    this.charsB = new Array<string>(len).fill(" ");
    this.fgsB = new Array<string | undefined>(len).fill(undefined);
    this.bgsB = new Array<string | undefined>(len).fill(undefined);
    this.stylesB = new Array<string | undefined>(len).fill(undefined);

    this.chars = this.charsA;
    this.fgs = this.fgsA;
    this.bgs = this.bgsA;
    this.stys = this.stylesA;
  }

  /** Clear the buffer in-place */
  clear(): void {
    this.chars.fill(" ");
    this.fgs.fill(undefined);
    this.bgs.fill(undefined);
    this.stys.fill(undefined);
    this.markFullDirty();
  }

  /** Resize the canvas and clear buffers */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const len = width * height;

    this.charsA = new Array<string>(len).fill(" ");
    this.fgsA = new Array<string | undefined>(len).fill(undefined);
    this.bgsA = new Array<string | undefined>(len).fill(undefined);
    this.stylesA = new Array<string | undefined>(len).fill(undefined);

    this.charsB = new Array<string>(len).fill(" ");
    this.fgsB = new Array<string | undefined>(len).fill(undefined);
    this.bgsB = new Array<string | undefined>(len).fill(undefined);
    this.stylesB = new Array<string | undefined>(len).fill(undefined);

    this.chars = this.charsA;
    this.fgs = this.fgsA;
    this.bgs = this.bgsA;
    this.stys = this.stylesA;

    this.prevChars = null;
    this.prevFgs = null;
    this.prevBgs = null;
    this.prevStys = null;

    this.markFullDirty();
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
      const idx = yi * this.width + xi;
      this.chars[idx] = cell.char;
      this.fgs[idx] = cell.fg;
      this.bgs[idx] = cell.bg;
      this.stys[idx] = cell.style;
      this.markDirty(xi, yi);
    }
  }

  /** Get a cell at position */
  get(x: number, y: number): Cell | undefined {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi >= 0 && xi < this.width && yi >= 0 && yi < this.height) {
      const idx = yi * this.width + xi;
      return {
        char: this.chars[idx],
        fg: this.fgs[idx],
        bg: this.bgs[idx],
        style: this.stys[idx],
      };
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
    const xi = Math.floor(x);
    const yi = Math.floor(y);

    // Fast path: pure ASCII, no ANSI codes
    if (this.isAsciiClean(text)) {
      for (let i = 0; i < text.length; i++) {
        this.set(xi + i, yi, {
          char: text[i],
          fg: options?.fg,
          bg: options?.bg,
          style: options?.style,
        });
      }
      return;
    }

    // Slow path: strip ANSI, handle wide chars
    const stripped = stripAnsi(text);
    let col = 0;
    for (const char of stripped) {
      const width = charWidth(char);
      if (width === 0) continue;

      this.set(xi + col, yi, {
        char: char,
        fg: options?.fg,
        bg: options?.bg,
        style: options?.style,
      });

      // For wide characters, fill the next cell with empty placeholder
      if (width === 2) {
        this.set(xi + col + 1, yi, {
          char: "",
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

    // Use dirty region bounds if available, otherwise full screen
    const minY = this.hasDirty ? this.dirtyMinY : 0;
    const maxY = this.hasDirty ? this.dirtyMaxY : this.height - 1;
    const minX = this.hasDirty ? this.dirtyMinX : 0;
    const maxX = this.hasDirty ? this.dirtyMaxX : this.width - 1;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * this.width + x;
        const ch = this.chars[idx];
        const cfgs = this.fgs[idx];
        const cbgs = this.bgs[idx];
        const csty = this.stys[idx];

        // Skip empty placeholder cells (second half of wide characters)
        if (ch === "") continue;

        // Skip if cell hasn't changed
        if (
          this.prevChars !== null &&
          this.prevChars[idx] === ch &&
          this.prevFgs![idx] === cfgs &&
          this.prevBgs![idx] === cbgs &&
          this.prevStys![idx] === csty
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
        if (csty !== curStyle || cfgs !== curFg || cbgs !== curBg) {
          parts.push(style.reset);
          if (csty) parts.push(csty);
          if (cfgs) parts.push(cfgs);
          if (cbgs) parts.push(cbgs);
          curStyle = csty;
          curFg = cfgs;
          curBg = cbgs;
        }

        parts.push(ch);
        penX = x + (charWidth(ch) > 1 ? 2 : 1);
        penY = y;
      }
    }

    if (parts.length > 0) {
      parts.push(style.reset);
      write(parts.join(""));
    }

    // Swap buffers
    this.prevChars = this.chars;
    this.prevFgs = this.fgs;
    this.prevBgs = this.bgs;
    this.prevStys = this.stys;

    if (this.chars === this.charsA) {
      this.chars = this.charsB;
      this.fgs = this.fgsB;
      this.bgs = this.bgsB;
      this.stys = this.stylesB;
    } else {
      this.chars = this.charsA;
      this.fgs = this.fgsA;
      this.bgs = this.bgsA;
      this.stys = this.stylesA;
    }

    this.resetDirty();
  }

  /** Force full redraw (ignores diff) */
  fullRender(): void {
    this.prevChars = null;
    this.prevFgs = null;
    this.prevBgs = null;
    this.prevStys = null;
    this.markFullDirty();
    this.render();
  }

  /** Get plain text representation of the canvas (no styles) */
  toString(): string {
    const lines: string[] = [];
    for (let y = 0; y < this.height; y++) {
      let line = "";
      for (let x = 0; x < this.width; x++) {
        const ch = this.chars[y * this.width + x];
        if (ch === "") continue; // skip wide char placeholder
        line += ch;
      }
      lines.push(line);
    }
    return lines.join("\n");
  }

  /** Get text with ANSI escape codes */
  toAnsi(): string {
    const lines: string[] = [];
    for (let y = 0; y < this.height; y++) {
      const parts: string[] = [];
      let curStyle: string | undefined,
        curFg: string | undefined,
        curBg: string | undefined;

      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const ch = this.chars[idx];
        if (ch === "") continue;

        const cfgs = this.fgs[idx];
        const cbgs = this.bgs[idx];
        const csty = this.stys[idx];

        if (csty !== curStyle || cfgs !== curFg || cbgs !== curBg) {
          parts.push(style.reset);
          if (csty) parts.push(csty);
          if (cfgs) parts.push(cfgs);
          if (cbgs) parts.push(cbgs);
          curStyle = csty;
          curFg = cfgs;
          curBg = cbgs;
        }

        parts.push(ch);
      }

      if (curStyle || curFg || curBg) {
        parts.push(style.reset);
      }
      lines.push(parts.join(""));
    }
    return lines.join("\n");
  }

  /** Get a sub-region as plain text */
  regionToString(rx: number, ry: number, rw: number, rh: number): string {
    const lines: string[] = [];
    for (let y = ry; y < ry + rh && y < this.height; y++) {
      let line = "";
      for (let x = rx; x < rx + rw && x < this.width; x++) {
        const ch = this.chars[y * this.width + x];
        if (ch === "") continue;
        line += ch;
      }
      lines.push(line);
    }
    return lines.join("\n");
  }

  // -- Private helpers --

  private isAsciiClean(s: string): boolean {
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c < 0x20 || c > 0x7e) return false;
    }
    return true;
  }

  private markDirty(x: number, y: number): void {
    if (!this.hasDirty) {
      this.dirtyMinX = x;
      this.dirtyMinY = y;
      this.dirtyMaxX = x;
      this.dirtyMaxY = y;
      this.hasDirty = true;
    } else {
      if (x < this.dirtyMinX) this.dirtyMinX = x;
      if (y < this.dirtyMinY) this.dirtyMinY = y;
      if (x > this.dirtyMaxX) this.dirtyMaxX = x;
      if (y > this.dirtyMaxY) this.dirtyMaxY = y;
    }
  }

  private markFullDirty(): void {
    this.dirtyMinX = 0;
    this.dirtyMinY = 0;
    this.dirtyMaxX = this.width - 1;
    this.dirtyMaxY = this.height - 1;
    this.hasDirty = true;
  }

  private resetDirty(): void {
    this.hasDirty = false;
    this.dirtyMinX = 0;
    this.dirtyMinY = 0;
    this.dirtyMaxX = 0;
    this.dirtyMaxY = 0;
  }
}
