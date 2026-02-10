import { assertEquals } from "@std/assert";
import { isKey, Keys, parseKeyEvent } from "./input.ts";
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

Deno.test("isKey matches simple keys", () => {
  const event = makeKeyEvent("q");

  assertEquals(isKey(event, "q"), true);
  assertEquals(isKey(event, "Q"), true); // case insensitive
  assertEquals(isKey(event, "x"), false);
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

  assertEquals(isKey(event, "a", { shift: true }), true);
  assertEquals(isKey(event, "a", { shift: false }), false);
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

Deno.test("parseKeyEvent: Enter (0x0d is Ctrl+M)", () => {
  // 0x0d falls in the Ctrl+letter range (0x01-0x1a)
  const event = parseKeyEvent(new Uint8Array([0x0d]));
  assertEquals(event.key, "m");
  assertEquals(event.ctrl, true);
});

Deno.test("parseKeyEvent: Backspace", () => {
  assertEquals(parseKeyEvent(new Uint8Array([0x7f])).key, Keys.Backspace);
});

Deno.test("parseKeyEvent: Tab (0x09 is Ctrl+I)", () => {
  // 0x09 falls in the Ctrl+letter range (0x01-0x1a)
  const event = parseKeyEvent(new Uint8Array([0x09]));
  assertEquals(event.key, "i");
  assertEquals(event.ctrl, true);
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
