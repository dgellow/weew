import { assertEquals } from "@std/assert";
import { isKey, keyEventsFrom, Keys, parseKeyEvent } from "./input.ts";
import type { KeyEvent } from "./input.ts";

function makeKeyEvent(
  key: string,
  opts: Partial<KeyEvent> = {},
): KeyEvent {
  return {
    key,
    ctrl: opts.ctrl ?? false,
    alt: opts.alt ?? false,
    shift: opts.shift ?? false,
    meta: opts.meta ?? false,
    raw: opts.raw ?? new Uint8Array(),
  };
}

Deno.test("Keys constants", () => {
  assertEquals(Keys.Enter, "Enter");
  assertEquals(Keys.Escape, "Escape");
  assertEquals(Keys.Up, "Up");
  assertEquals(Keys.Down, "Down");
});

Deno.test("isKey matches simple keys (case-sensitive)", () => {
  const event = makeKeyEvent("q");

  assertEquals(isKey(event, "q"), true);
  assertEquals(isKey(event, "Q"), false); // case-sensitive
  assertEquals(isKey(event, "x"), false);
});

Deno.test("isKey distinguishes g from G", () => {
  const lower = makeKeyEvent("g");
  const upper = makeKeyEvent("G", { shift: true });

  assertEquals(isKey(lower, "g"), true);
  assertEquals(isKey(lower, "G"), false);
  assertEquals(isKey(upper, "G"), true);
  assertEquals(isKey(upper, "g"), false);
});

Deno.test("isKey matches with ctrl modifier", () => {
  const event = makeKeyEvent("c", { ctrl: true });

  assertEquals(isKey(event, "c", { ctrl: true }), true);
  assertEquals(isKey(event, "c", { ctrl: false }), false);
  assertEquals(isKey(event, "c"), true); // no modifier check
});

Deno.test("isKey matches with alt modifier", () => {
  const event = makeKeyEvent("x", { alt: true });

  assertEquals(isKey(event, "x", { alt: true }), true);
  assertEquals(isKey(event, "x", { alt: false }), false);
});

Deno.test("isKey matches with shift modifier", () => {
  const event = makeKeyEvent("A", { shift: true });

  assertEquals(isKey(event, "A", { shift: true }), true);
  assertEquals(isKey(event, "A", { shift: false }), false);
});

Deno.test("isKey matches multiple modifiers", () => {
  const event = makeKeyEvent("s", { ctrl: true, shift: true });

  assertEquals(isKey(event, "s", { ctrl: true, shift: true }), true);
  assertEquals(isKey(event, "s", { ctrl: true }), true);
  assertEquals(isKey(event, "s", { ctrl: true, alt: true }), false);
});

// parseKeyEvent tests

Deno.test("parseKeyEvent: lone ESC byte", () => {
  const event = parseKeyEvent(new Uint8Array([0x1b]));
  assertEquals(event.key, Keys.Escape);
  assertEquals(event.ctrl, false);
});

Deno.test("parseKeyEvent: arrow keys", () => {
  assertEquals(
    parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x41])).key,
    Keys.Up,
  );
  assertEquals(
    parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x42])).key,
    Keys.Down,
  );
  assertEquals(
    parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x43])).key,
    Keys.Right,
  );
  assertEquals(
    parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x44])).key,
    Keys.Left,
  );
});

Deno.test("parseKeyEvent: Ctrl+letter", () => {
  // Ctrl+C = 0x03
  const event = parseKeyEvent(new Uint8Array([0x03]));
  assertEquals(event.key, "c");
  assertEquals(event.ctrl, true);
});

Deno.test("parseKeyEvent: F-keys", () => {
  // F5 = ESC [ 1 5 ~
  const f5 = parseKeyEvent(
    new Uint8Array([0x1b, 0x5b, 0x31, 0x35, 0x7e]),
  );
  assertEquals(f5.key, Keys.F5);

  // F1 via SS3 = ESC O P
  const f1 = parseKeyEvent(new Uint8Array([0x1b, 0x4f, 0x50]));
  assertEquals(f1.key, Keys.F1);
});

Deno.test("parseKeyEvent: modified keys with modifiers", () => {
  // Ctrl+Right = ESC [ 1 ; 5 C
  const encoder = new TextEncoder();
  const bytes = new Uint8Array([0x1b, 0x5b, ...encoder.encode("1;5C")]);
  const event = parseKeyEvent(bytes);
  assertEquals(event.key, Keys.Right);
  assertEquals(event.ctrl, true);
  assertEquals(event.shift, false);
});

Deno.test("parseKeyEvent: Ctrl+Delete", () => {
  // Ctrl+Delete = ESC [ 3 ; 5 ~
  const encoder = new TextEncoder();
  const bytes = new Uint8Array([0x1b, 0x5b, ...encoder.encode("3;5~")]);
  const event = parseKeyEvent(bytes);
  assertEquals(event.key, Keys.Delete);
  assertEquals(event.ctrl, true);
});

Deno.test("parseKeyEvent: Shift+Home", () => {
  // Shift+Home = ESC [ 1 ; 2 H
  const encoder = new TextEncoder();
  const bytes = new Uint8Array([0x1b, 0x5b, ...encoder.encode("1;2H")]);
  const event = parseKeyEvent(bytes);
  assertEquals(event.key, Keys.Home);
  assertEquals(event.shift, true);
});

Deno.test("parseKeyEvent: UTF-8 multibyte", () => {
  // é = 0xC3 0xA9
  const event = parseKeyEvent(new Uint8Array([0xc3, 0xa9]));
  assertEquals(event.key, "é");
});

Deno.test("parseKeyEvent: Enter (0x0d)", () => {
  const event = parseKeyEvent(new Uint8Array([0x0d]));
  assertEquals(event.key, Keys.Enter);
  assertEquals(event.ctrl, false);
});

Deno.test("parseKeyEvent: Backspace", () => {
  assertEquals(parseKeyEvent(new Uint8Array([0x7f])).key, Keys.Backspace);
});

Deno.test("parseKeyEvent: Tab (0x09)", () => {
  const event = parseKeyEvent(new Uint8Array([0x09]));
  assertEquals(event.key, Keys.Tab);
  assertEquals(event.ctrl, false);
});

Deno.test("parseKeyEvent: uppercase detects shift", () => {
  const event = parseKeyEvent(new Uint8Array([0x41])); // 'A'
  assertEquals(event.key, "A");
  assertEquals(event.shift, true);
});

Deno.test("parseKeyEvent: Alt+key", () => {
  // Alt+x = ESC x
  const event = parseKeyEvent(new Uint8Array([0x1b, 0x78]));
  assertEquals(event.key, "x");
  assertEquals(event.alt, true);
});

// Shift+Tab (CSI Z) tests

Deno.test("parseKeyEvent: Shift+Tab (CSI Z)", () => {
  // ESC [ Z
  const event = parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x5a]));
  assertEquals(event.key, Keys.Tab);
  assertEquals(event.shift, true);
  assertEquals(event.ctrl, false);
  assertEquals(event.alt, false);
});

Deno.test("parseKeyEvent: modified Shift+Tab (1;2Z)", () => {
  // ESC [ 1 ; 2 Z
  const encoder = new TextEncoder();
  const bytes = new Uint8Array([0x1b, 0x5b, ...encoder.encode("1;2Z")]);
  const event = parseKeyEvent(bytes);
  assertEquals(event.key, Keys.Tab);
  assertEquals(event.shift, true);
  assertEquals(event.ctrl, false);
});

// -- keyEventsFrom --

/** Create a ReadFn from a sequence of chunks with optional delays. */
function mockReader(
  chunks: { bytes: Uint8Array; delayMs?: number }[],
): () => Promise<Uint8Array | null> {
  let i = 0;
  return () => {
    if (i >= chunks.length) return Promise.resolve(null);
    const chunk = chunks[i++];
    if (chunk.delayMs) {
      return new Promise((resolve) =>
        setTimeout(() => resolve(chunk.bytes), chunk.delayMs)
      );
    }
    return Promise.resolve(chunk.bytes);
  };
}

async function collectEvents(
  read: () => Promise<Uint8Array | null>,
): Promise<KeyEvent[]> {
  const events: KeyEvent[] = [];
  for await (const event of keyEventsFrom(read)) {
    events.push(event);
  }
  return events;
}

const kefOpts = { sanitizeOps: false, sanitizeResources: false };

Deno.test({
  ...kefOpts,
  name: "keyEventsFrom: regular ASCII keys",
  fn: async () => {
    const read = mockReader([
      { bytes: new Uint8Array([0x61]) }, // 'a'
      { bytes: new Uint8Array([0x62]) }, // 'b'
    ]);
    const events = await collectEvents(read);
    assertEquals(events.length, 2);
    assertEquals(events[0].key, "a");
    assertEquals(events[1].key, "b");
  },
});

Deno.test({
  ...kefOpts,
  name: "keyEventsFrom: ESC followed by sequence bytes",
  fn: async () => {
    // ESC arrives, then arrow-up bytes arrive quickly (before 50ms timeout)
    const read = mockReader([
      { bytes: new Uint8Array([0x1b]) },
      { bytes: new Uint8Array([0x5b, 0x41]) }, // [ A = Up
    ]);
    const events = await collectEvents(read);
    assertEquals(events.length, 1);
    assertEquals(events[0].key, "Up");
  },
});

Deno.test({
  ...kefOpts,
  name: "keyEventsFrom: lone ESC when no follow-up bytes",
  fn: async () => {
    // ESC arrives, then nothing for >50ms, then EOF
    const read = mockReader([
      { bytes: new Uint8Array([0x1b]) },
      { bytes: new Uint8Array([0x61]), delayMs: 100 }, // 'a' after 100ms
    ]);
    const events = await collectEvents(read);
    assertEquals(events.length, 2);
    assertEquals(events[0].key, "Escape");
    assertEquals(events[1].key, "a");
  },
});

Deno.test({
  ...kefOpts,
  name: "keyEventsFrom: two ESC keys in quick succession",
  fn: async () => {
    // Two lone ESC bytes, each followed by a delay > 50ms
    // Should produce two separate Escape events
    const read = mockReader([
      { bytes: new Uint8Array([0x1b]) },
      { bytes: new Uint8Array([0x1b]), delayMs: 100 },
      // EOF after second ESC times out
    ]);
    const events = await collectEvents(read);
    assertEquals(events.length, 2);
    assertEquals(events[0].key, "Escape");
    assertEquals(events[1].key, "Escape");
  },
});
