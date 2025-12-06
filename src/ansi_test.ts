import { assertEquals } from "jsr:@std/assert";
import { CSI, ESC, stripAnsi, styled, visibleLength } from "./ansi.ts";

Deno.test("ESC and CSI constants", () => {
  assertEquals(ESC, "\x1b");
  assertEquals(CSI, "\x1b[");
});

Deno.test("stripAnsi removes ANSI codes", () => {
  assertEquals(stripAnsi("hello"), "hello");
  assertEquals(stripAnsi("\x1b[31mred\x1b[0m"), "red");
  assertEquals(stripAnsi("\x1b[1;32mbold green\x1b[0m"), "bold green");
  assertEquals(stripAnsi("no\x1b[0mcodes\x1b[1mhere"), "nocodeshere");
});

Deno.test("visibleLength returns length without ANSI codes", () => {
  assertEquals(visibleLength("hello"), 5);
  assertEquals(visibleLength("\x1b[31mhello\x1b[0m"), 5);
  assertEquals(visibleLength("\x1b[1;32mhi\x1b[0m there"), 8);
});

Deno.test("styled wraps text with styles", () => {
  assertEquals(styled("text"), "text");
  assertEquals(styled("text", "\x1b[31m"), "\x1b[31mtext\x1b[0m");
  assertEquals(
    styled("text", "\x1b[1m", "\x1b[31m"),
    "\x1b[1m\x1b[31mtext\x1b[0m",
  );
});
