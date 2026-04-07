/** ScreenIO implementation for runtimes that support node:process and node:buffer. */

import { once } from "node:events";
import nodeProcess from "node:process";
import { clear, cursor, screen } from "./ansi.ts";
import type { Canvas } from "./canvas.ts";
import { keyEventsFrom } from "./input.ts";
import type { ScreenEvent, ScreenIO } from "./screen.ts";

/** Create a ScreenIO backed by node:process stdin/stdout. */
export function nodeTerminalIO(): ScreenIO {
  const encoder = new TextEncoder();
  let closed = false;
  let onClose: (() => void) | null = null;
  let onCloseRead: (() => void) | null = null;

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

      // Key reader using shared keyEventsFrom with pull-based stdin reads.
      // Race each read against a close signal so close() can unblock it.
      const closeSignal = new Promise<null>((resolve) => {
        onCloseRead = () => resolve(null);
      });

      const read = async (): Promise<Uint8Array | null> => {
        if (closed) return null;
        try {
          const result = await Promise.race([
            once(nodeProcess.stdin, "data").then(
              ([chunk]) => new Uint8Array(chunk),
            ),
            closeSignal,
          ]);
          return result;
        } catch {
          return null;
        }
      };

      let keyReaderDone = false;
      const keyReaderPromise = (async () => {
        for await (const event of keyEventsFrom(read)) {
          if (closed) break;
          queue.push({ ...event, type: "key" as const });
          notify();
        }
        keyReaderDone = true;
        notify();
      })();

      try {
        while (!closed && !keyReaderDone) {
          while (queue.length > 0) {
            yield queue.shift()!;
          }
          if (closed || keyReaderDone) break;
          await new Promise<void>((resolve) => {
            wakeup = resolve;
          });
          wakeup = null;
        }
        while (queue.length > 0) {
          yield queue.shift()!;
        }
      } finally {
        nodeProcess.off("SIGWINCH", resizeHandler);
        await keyReaderPromise.catch(() => {});
        onClose = null;
      }
    },

    close(): void {
      closed = true;
      nodeProcess.stdin.pause();
      onCloseRead?.();
      onClose?.();
    },
  };
}
