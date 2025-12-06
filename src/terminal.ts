// Terminal interaction utilities

import { clear, cursor, screen } from "./ansi.ts";

export interface TerminalSize {
  columns: number;
  rows: number;
}

// Get terminal dimensions
export function getSize(): TerminalSize {
  try {
    const { columns, rows } = Deno.consoleSize();
    return { columns, rows };
  } catch {
    return { columns: 80, rows: 24 };
  }
}

// Writer for terminal output
const encoder = new TextEncoder();

export function write(str: string): void {
  Deno.stdout.writeSync(encoder.encode(str));
}

export function writeLine(str: string): void {
  write(str + "\n");
}

// Terminal control functions
export function hideCursor(): void {
  write(cursor.hide);
}

export function showCursor(): void {
  write(cursor.show);
}

export function moveTo(x: number, y: number): void {
  write(cursor.to(x, y));
}

export function clearScreen(): void {
  write(clear.screen + cursor.home);
}

export function clearLine(): void {
  write(clear.line);
}

// Enter/exit alternate screen buffer
export function enterAltScreen(): void {
  write(screen.alt);
}

export function exitAltScreen(): void {
  write(screen.main);
}

// Set raw mode for input handling
export function setRawMode(enabled: boolean): void {
  try {
    Deno.stdin.setRaw(enabled);
  } catch {
    // Ignore if not a TTY
  }
}

// Check if running in a TTY
export function isTTY(): boolean {
  try {
    return Deno.stdin.isTerminal() && Deno.stdout.isTerminal();
  } catch {
    return false;
  }
}

// Listen for terminal resize events
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
