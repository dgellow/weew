/** ScreenIO implementation for runtimes that support node:process and node:buffer. */

import type { Buffer } from "node:buffer";
import nodeProcess from "node:process";
import { clear, cursor, screen } from "./ansi.ts";
import type { Canvas } from "./canvas.ts";
import { parseKeyEvent } from "./input.ts";
import type { ScreenEvent, ScreenIO } from "./screen.ts";

/** Create a ScreenIO backed by node:process stdin/stdout. */
export function nodeTerminalIO(): ScreenIO {
  const encoder = new TextEncoder();
  let closed = false;
  let onClose: (() => void) | null = null;

  function writeStr(str: string): void {
    nodeProcess.stdout.write(encoder.encode(str));
  }

  return {
    size(): { columns: number; rows: number } {
      return {
        columns: nodeProcess.stdout.columns ?? 80,
        rows: nodeProcess.stdout.rows ?? 24,
      };
    },

    setup(altScreen: boolean, hideCursor: boolean): void {
      if (altScreen) writeStr(screen.alt);
      if (hideCursor) writeStr(cursor.hide);
      if (nodeProcess.stdin.isTTY) {
        nodeProcess.stdin.setRawMode(true);
      }
      nodeProcess.stdin.resume();
      writeStr(clear.screen + cursor.home);
    },

    teardown(altScreen: boolean, hideCursor: boolean): void {
      if (nodeProcess.stdin.isTTY) {
        nodeProcess.stdin.setRawMode(false);
      }
      if (hideCursor) writeStr(cursor.show);
      if (altScreen) writeStr(screen.main);
    },

    flush(canvas: Canvas): void {
      const output = canvas.render();
      if (output) writeStr(output);
    },

    async *events(): AsyncGenerator<ScreenEvent> {
      const queue: ScreenEvent[] = [];
      let wakeup: (() => void) | null = null;

      const notify = () => {
        wakeup?.();
      };

      onClose = notify;

      // Handle resize via SIGWINCH
      const resizeHandler = () => {
        queue.push({
          type: "resize",
          columns: nodeProcess.stdout.columns ?? 80,
          rows: nodeProcess.stdout.rows ?? 24,
        });
        notify();
      };
      nodeProcess.on("SIGWINCH", resizeHandler);

      // Handle keyboard input with ESC disambiguation
      const ESC_TIMEOUT = 50;
      let pendingEsc: Uint8Array | null = null;
      let escTimer: ReturnType<typeof setTimeout> | null = null;

      const dataHandler = (chunk: Buffer) => {
        const bytes = new Uint8Array(chunk);

        if (bytes.length === 1 && bytes[0] === 0x1b) {
          pendingEsc = bytes;
          escTimer = setTimeout(() => {
            if (pendingEsc) {
              queue.push({ ...parseKeyEvent(pendingEsc), type: "key" });
              pendingEsc = null;
              notify();
            }
          }, ESC_TIMEOUT);
          return;
        }

        if (pendingEsc) {
          if (escTimer) clearTimeout(escTimer);
          const combined = new Uint8Array(pendingEsc.length + bytes.length);
          combined.set(pendingEsc);
          combined.set(bytes, pendingEsc.length);
          pendingEsc = null;
          queue.push({ ...parseKeyEvent(combined), type: "key" });
          notify();
          return;
        }

        queue.push({ ...parseKeyEvent(bytes), type: "key" });
        notify();
      };
      nodeProcess.stdin.on("data", dataHandler);

      try {
        while (!closed) {
          while (queue.length > 0) {
            yield queue.shift()!;
          }
          if (closed) break;
          await new Promise<void>((resolve) => {
            wakeup = resolve;
          });
          wakeup = null;
        }
        while (queue.length > 0) {
          yield queue.shift()!;
        }
      } finally {
        nodeProcess.stdin.off("data", dataHandler);
        nodeProcess.off("SIGWINCH", resizeHandler);
        if (escTimer) clearTimeout(escTimer);
        onClose = null;
      }
    },

    close(): void {
      closed = true;
      nodeProcess.stdin.pause();
      onClose?.();
    },
  };
}
