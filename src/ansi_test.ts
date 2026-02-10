import { assertEquals } from "@std/assert";
import {
  charWidth,
  CSI,
  ESC,
  stripAnsi,
  styled,
  visibleLength,
} from "./ansi.ts";

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

Deno.test("charWidth returns correct width for ASCII", () => {
  assertEquals(charWidth("a"), 1);
  assertEquals(charWidth("Z"), 1);
  assertEquals(charWidth(" "), 1);
  assertEquals(charWidth("1"), 1);
});

Deno.test("charWidth returns 2 for wide characters", () => {
  assertEquals(charWidth("中"), 2); // CJK
  assertEquals(charWidth("日"), 2); // CJK
  assertEquals(charWidth("한"), 2); // Korean
  assertEquals(charWidth("🎉"), 2); // Emoji
  assertEquals(charWidth("❤"), 2); // Emoji
});

Deno.test("charWidth returns 0 for combining marks", () => {
  assertEquals(charWidth("\u0301"), 0); // Combining acute accent
  assertEquals(charWidth("\u200b"), 0); // Zero width space
});

Deno.test("visibleLength handles wide characters", () => {
  assertEquals(visibleLength("hello"), 5);
  assertEquals(visibleLength("你好"), 4); // 2 chars * 2 width
  assertEquals(visibleLength("hi你好"), 6); // 2 + 4
  assertEquals(visibleLength("🎉🎉"), 4); // 2 emoji * 2 width
});

Deno.test("visibleLength handles mixed ANSI and wide chars", () => {
  assertEquals(visibleLength("\x1b[31m你好\x1b[0m"), 4);
  assertEquals(visibleLength("hello\x1b[1m世界\x1b[0m"), 9); // 5 + 4
});

Deno.test("stripAnsi handles private mode sequences with ?", () => {
  assertEquals(stripAnsi("\x1b[?25h"), ""); // Show cursor
  assertEquals(stripAnsi("\x1b[?25l"), ""); // Hide cursor
  assertEquals(stripAnsi("\x1b[?1049h"), ""); // Alt screen
  assertEquals(stripAnsi("text\x1b[?25hmore"), "textmore");
});

Deno.test("stripAnsi handles tilde-terminated sequences", () => {
  assertEquals(stripAnsi("\x1b[3~"), ""); // Delete key
  assertEquals(stripAnsi("\x1b[5~"), ""); // Page up
  assertEquals(stripAnsi("\x1b[15~"), ""); // F5
  assertEquals(stripAnsi("a\x1b[3~b"), "ab");
});

Deno.test("stripAnsi handles OSC sequences", () => {
  assertEquals(stripAnsi("\x1b]0;title\x07"), ""); // OSC with BEL
  assertEquals(stripAnsi("\x1b]0;title\x1b\\"), ""); // OSC with ST
  assertEquals(stripAnsi("text\x1b]0;window title\x07more"), "textmore");
});
