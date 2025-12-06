import { assertEquals } from "@std/assert";
import { isKey, Keys } from "./input.ts";
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
