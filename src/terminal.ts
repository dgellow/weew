/** Terminal interaction utilities — low-level wrappers around Deno terminal APIs. */

import { clear, cursor, osc, screen } from "./ansi.ts";

/** Terminal dimensions in characters. */
export interface TerminalSize {
  columns: number;
  rows: number;
}

/** Get current terminal dimensions. Returns 80x24 if not a TTY. */
export function getSize(): TerminalSize {
  try {
    const { columns, rows } = Deno.consoleSize();
    return { columns, rows };
  } catch {
    return { columns: 80, rows: 24 };
  }
}

/** Synchronously write a string to stdout. */
const encoder = new TextEncoder();

export function write(str: string): void {
  Deno.stdout.writeSync(encoder.encode(str));
}

/** Write a string followed by a newline to stdout. */
export function writeLine(str: string): void {
  write(str + "\n");
}

/** Hide the terminal cursor. */
export function hideCursor(): void {
  write(cursor.hide);
}

/** Show the terminal cursor. */
export function showCursor(): void {
  write(cursor.show);
}

/** Move the cursor to the given 0-based (x, y) position. */
export function moveTo(x: number, y: number): void {
  write(cursor.to(x, y));
}

/** Clear the entire screen and move cursor to home position. */
export function clearScreen(): void {
  write(clear.screen + cursor.home);
}

/** Clear the current line. */
export function clearLine(): void {
  write(clear.line);
}

/** Enter the alternate screen buffer (preserves the original screen content). */
export function enterAltScreen(): void {
  write(screen.alt);
}

/** Exit the alternate screen buffer and restore the original screen. */
export function exitAltScreen(): void {
  write(screen.main);
}

/** Enable or disable raw mode on stdin. No-op if not a TTY. */
export function setRawMode(enabled: boolean): void {
  try {
    Deno.stdin.setRaw(enabled);
  } catch {
    // Ignore if not a TTY
  }
}

/** Check if both stdin and stdout are connected to a TTY. */
export function isTTY(): boolean {
  try {
    return Deno.stdin.isTerminal() && Deno.stdout.isTerminal();
  } catch {
    return false;
  }
}

/**
 * Listen for terminal resize events (SIGWINCH).
 * @param callback - Called with the new terminal size on each resize
 * @returns A cleanup function that removes the listener
 */
export function onResize(callback: (size: TerminalSize) => void): () => void {
  const handler = () => {
    callback(getSize());
  };

  try {
    Deno.addSignalListener("SIGWINCH", handler);
  } catch {
    // Signals may not be supported (e.g., Windows)
    return () => {};
  }

  return () => {
    try {
      Deno.removeSignalListener("SIGWINCH", handler);
    } catch {
      // Ignore removal errors
    }
  };
}

/** Set the terminal window title via OSC 0. Readable by screen readers. */
export function setTitle(title: string): void {
  write(osc.setTitle(title));
}

/** Ring the terminal bell. Universally supported and screen-reader-friendly. */
export function bell(): void {
  write(osc.bell);
}

/** Check if the NO_COLOR environment variable is set (https://no-color.org/). */
export function noColor(): boolean {
  try {
    return Deno.env.get("NO_COLOR") !== undefined;
  } catch {
    return false;
  }
}

/** Check if the REDUCE_MOTION environment variable is set. */
export function prefersReducedMotion(): boolean {
  try {
    return Deno.env.get("REDUCE_MOTION") !== undefined;
  } catch {
    return false;
  }
}
