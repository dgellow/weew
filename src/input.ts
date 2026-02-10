// Input handling - keyboard and mouse events

export interface KeyEvent {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  raw: Uint8Array;
}

// Special key codes
export const Keys = {
  Enter: "Enter",
  Escape: "Escape",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  Up: "Up",
  Down: "Down",
  Left: "Left",
  Right: "Right",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Insert: "Insert",
  Space: " ",
  F1: "F1",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  F10: "F10",
  F11: "F11",
  F12: "F12",
} as const;

// Parse raw bytes into key event
export function parseKeyEvent(bytes: Uint8Array): KeyEvent {
  const raw = bytes;
  let key = "";
  let ctrl = false;
  let alt = false;
  let shift = false;
  let meta = false;

  // Single byte keys
  if (bytes.length === 1) {
    const byte = bytes[0];

    // Ctrl+letter (0x01-0x1A)
    if (byte >= 0x01 && byte <= 0x1a) {
      ctrl = true;
      key = String.fromCharCode(byte + 0x60); // Convert to lowercase letter
      return { key, ctrl, alt, shift, meta, raw };
    }

    // Special single-byte keys
    switch (byte) {
      case 0x1b:
        key = Keys.Escape;
        break;
      case 0x7f:
      case 0x08:
        key = Keys.Backspace;
        break;
      case 0x09:
        key = Keys.Tab;
        break;
      case 0x0d:
      case 0x0a:
        key = Keys.Enter;
        break;
      case 0x00:
        ctrl = true;
        key = " ";
        break;
      default:
        key = String.fromCharCode(byte);
        // Detect uppercase/shift
        if (byte >= 0x41 && byte <= 0x5a) {
          shift = true;
        }
    }

    return { key, ctrl, alt, shift, meta, raw };
  }

  // Escape sequences
  if (bytes[0] === 0x1b) {
    // Alt+key
    if (bytes.length === 2 && bytes[1] >= 0x20) {
      alt = true;
      key = String.fromCharCode(bytes[1]);
      return { key, ctrl, alt, shift, meta, raw };
    }

    // CSI sequences (ESC [)
    if (bytes.length >= 3 && bytes[1] === 0x5b) {
      const seq = new TextDecoder().decode(bytes.slice(2));

      // Arrow keys
      if (seq === "A") key = Keys.Up;
      else if (seq === "B") key = Keys.Down;
      else if (seq === "C") key = Keys.Right;
      else if (seq === "D") key = Keys.Left;
      else if (seq === "H") key = Keys.Home;
      else if (seq === "F") key = Keys.End;
      else if (seq === "2~") key = Keys.Insert;
      else if (seq === "3~") key = Keys.Delete;
      else if (seq === "5~") key = Keys.PageUp;
      else if (seq === "6~") key = Keys.PageDown;
      // Function keys
      else if (seq === "11~" || seq === "1P") key = Keys.F1;
      else if (seq === "12~" || seq === "1Q") key = Keys.F2;
      else if (seq === "13~" || seq === "1R") key = Keys.F3;
      else if (seq === "14~" || seq === "1S") key = Keys.F4;
      else if (seq === "15~") key = Keys.F5;
      else if (seq === "17~") key = Keys.F6;
      else if (seq === "18~") key = Keys.F7;
      else if (seq === "19~") key = Keys.F8;
      else if (seq === "20~") key = Keys.F9;
      else if (seq === "21~") key = Keys.F10;
      else if (seq === "23~") key = Keys.F11;
      else if (seq === "24~") key = Keys.F12;
      // Modified keys (with modifiers): e.g. "1;5C" (Ctrl+Right), "3;5~" (Ctrl+Delete)
      else if (seq.includes(";")) {
        const match = seq.match(/^(\d+);(\d+)([A-Z~])$/);
        if (match) {
          const param = match[1];
          const modifier = parseInt(match[2]) - 1;
          const finalChar = match[3];
          shift = (modifier & 1) !== 0;
          alt = (modifier & 2) !== 0;
          ctrl = (modifier & 4) !== 0;
          meta = (modifier & 8) !== 0;

          if (finalChar === "~") {
            // Tilde-terminated: param identifies the key
            if (param === "2") key = Keys.Insert;
            else if (param === "3") key = Keys.Delete;
            else if (param === "5") key = Keys.PageUp;
            else if (param === "6") key = Keys.PageDown;
            else if (param === "11") key = Keys.F1;
            else if (param === "12") key = Keys.F2;
            else if (param === "13") key = Keys.F3;
            else if (param === "14") key = Keys.F4;
            else if (param === "15") key = Keys.F5;
            else if (param === "17") key = Keys.F6;
            else if (param === "18") key = Keys.F7;
            else if (param === "19") key = Keys.F8;
            else if (param === "20") key = Keys.F9;
            else if (param === "21") key = Keys.F10;
            else if (param === "23") key = Keys.F11;
            else if (param === "24") key = Keys.F12;
          } else {
            // Letter-terminated: finalChar identifies the key
            if (finalChar === "A") key = Keys.Up;
            else if (finalChar === "B") key = Keys.Down;
            else if (finalChar === "C") key = Keys.Right;
            else if (finalChar === "D") key = Keys.Left;
            else if (finalChar === "H") key = Keys.Home;
            else if (finalChar === "F") key = Keys.End;
            else if (finalChar === "P") key = Keys.F1;
            else if (finalChar === "Q") key = Keys.F2;
            else if (finalChar === "R") key = Keys.F3;
            else if (finalChar === "S") key = Keys.F4;
          }
        }
      }

      if (key) return { key, ctrl, alt, shift, meta, raw };
    }

    // SS3 sequences (ESC O)
    if (bytes.length >= 3 && bytes[1] === 0x4f) {
      const code = bytes[2];
      if (code === 0x50) key = Keys.F1;
      else if (code === 0x51) key = Keys.F2;
      else if (code === 0x52) key = Keys.F3;
      else if (code === 0x53) key = Keys.F4;

      if (key) return { key, ctrl, alt, shift, meta, raw };
    }
  }

  // Multi-byte UTF-8 character
  try {
    key = new TextDecoder().decode(bytes);
  } catch {
    key = "";
  }

  return { key, ctrl, alt, shift, meta, raw };
}

// Keyboard input reader
export class KeyboardInput {
  private running = false;
  private handlers: ((event: KeyEvent) => void)[] = [];
  private pendingRead: Promise<number | null> | null = null;
  private readBuffer = new Uint8Array(16);

  onKey(handler: (event: KeyEvent) => void): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index >= 0) this.handlers.splice(index, 1);
    };
  }

  private emit(event: KeyEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  private doRead(): Promise<number | null> {
    if (this.pendingRead) {
      const p = this.pendingRead;
      this.pendingRead = null;
      return p;
    }
    return Deno.stdin.read(this.readBuffer);
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const ESC_TIMEOUT = 50;

    while (this.running) {
      try {
        const n = await this.doRead();
        if (n === null) break;

        const bytes = this.readBuffer.slice(0, n);

        // ESC disambiguation: lone 0x1b could be Escape or start of sequence
        if (n === 1 && bytes[0] === 0x1b) {
          // Race a second read against a timeout
          const nextRead = Deno.stdin.read(this.readBuffer);
          const timeout = new Promise<"timeout">((resolve) =>
            setTimeout(() => resolve("timeout"), ESC_TIMEOUT)
          );

          const result = await Promise.race([nextRead, timeout]);

          if (result === "timeout") {
            // Lone Escape key
            this.emit(parseKeyEvent(bytes));
            // Store the pending read for next iteration
            this.pendingRead = nextRead;
          } else {
            // Got more bytes — combine with ESC and parse as sequence
            if (result === null) break;
            const combined = new Uint8Array(1 + result);
            combined[0] = 0x1b;
            combined.set(this.readBuffer.slice(0, result), 1);
            this.emit(parseKeyEvent(combined));
          }
          continue;
        }

        const event = parseKeyEvent(bytes);
        this.emit(event);
      } catch (e) {
        if (!this.running) break;
        if (e instanceof Deno.errors.Interrupted) {
          break;
        }
        if (e instanceof Deno.errors.BadResource) {
          break;
        }
        throw e;
      }
    }
  }

  stop(): void {
    this.running = false;
    try {
      Deno.stdin.close();
    } catch {
      // Ignore if already closed
    }
  }
}

// Simple async key reading
export async function readKey(): Promise<KeyEvent> {
  const buffer = new Uint8Array(16);
  const n = await Deno.stdin.read(buffer);
  if (n === null) throw new Error("stdin closed");
  return parseKeyEvent(buffer.slice(0, n));
}

// Key event iterator
export async function* keyEvents(): AsyncGenerator<KeyEvent> {
  const buffer = new Uint8Array(16);

  while (true) {
    try {
      const n = await Deno.stdin.read(buffer);
      if (n === null) break;
      yield parseKeyEvent(buffer.slice(0, n));
    } catch (e) {
      if (e instanceof Deno.errors.Interrupted) break;
      throw e;
    }
  }
}

// Helper to check for specific key combos
export function isKey(
  event: KeyEvent,
  key: string,
  modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean },
): boolean {
  if (event.key.toLowerCase() !== key.toLowerCase()) return false;
  if (modifiers?.ctrl !== undefined && event.ctrl !== modifiers.ctrl) {
    return false;
  }
  if (modifiers?.alt !== undefined && event.alt !== modifiers.alt) return false;
  if (modifiers?.shift !== undefined && event.shift !== modifiers.shift) {
    return false;
  }
  return true;
}
