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

// ============================================================
// cursor, clear, style, fg, bg, screen, osc sequence tests
// ============================================================

import { bg, clear, cursor, fg, osc, screen, style } from "./ansi.ts";

Deno.test("cursor.to produces correct CSI sequence (1-based)", () => {
  const seq = cursor.to(5, 10);
  assertEquals(seq.includes("11;6H"), true);
});

Deno.test("cursor.up produces correct sequence", () => {
  const seq = cursor.up(3);
  assertEquals(seq.includes("3A"), true);
});

Deno.test("cursor.hide contains DEC sequence for hiding", () => {
  assertEquals(cursor.hide.includes("?25l"), true);
});

Deno.test("cursor.show contains DEC sequence for showing", () => {
  assertEquals(cursor.show.includes("?25h"), true);
});

Deno.test("cursor.home contains H", () => {
  assertEquals(cursor.home.includes("H"), true);
});

Deno.test("cursor.save and cursor.restore", () => {
  assertEquals(cursor.save.includes("7"), true);
  assertEquals(cursor.restore.includes("8"), true);
});

Deno.test("clear.screen contains 2J", () => {
  assertEquals(clear.screen.includes("2J"), true);
});

Deno.test("clear.line contains 2K", () => {
  assertEquals(clear.line.includes("2K"), true);
});

Deno.test("clear.toEnd contains 0J", () => {
  assertEquals(clear.toEnd.includes("0J"), true);
});

Deno.test("clear.toStart contains 1J", () => {
  assertEquals(clear.toStart.includes("1J"), true);
});

Deno.test("style.bold contains 1m", () => {
  assertEquals(style.bold.includes("1m"), true);
});

Deno.test("style.dim contains 2m", () => {
  assertEquals(style.dim.includes("2m"), true);
});

Deno.test("style.italic contains 3m", () => {
  assertEquals(style.italic.includes("3m"), true);
});

Deno.test("style.underline contains 4m", () => {
  assertEquals(style.underline.includes("4m"), true);
});

Deno.test("style.reset contains 0m", () => {
  assertEquals(style.reset.includes("0m"), true);
});

Deno.test("fg.red contains 31m", () => {
  assertEquals(fg.red.includes("31m"), true);
});

Deno.test("fg.rgb produces correct 24-bit color sequence", () => {
  const seq = fg.rgb(255, 0, 128);
  assertEquals(seq.includes("38;2;255;0;128m"), true);
});

Deno.test("fg.color produces correct 256-color sequence", () => {
  const seq = fg.color(42);
  assertEquals(seq.includes("38;5;42m"), true);
});

Deno.test("bg.blue contains 44m", () => {
  assertEquals(bg.blue.includes("44m"), true);
});

Deno.test("bg.rgb produces correct 24-bit background color sequence", () => {
  const seq = bg.rgb(0, 255, 0);
  assertEquals(seq.includes("48;2;0;255;0m"), true);
});

Deno.test("screen.alt contains 1049h", () => {
  assertEquals(screen.alt.includes("1049h"), true);
});

Deno.test("screen.main contains 1049l", () => {
  assertEquals(screen.main.includes("1049l"), true);
});

Deno.test("osc.setTitle contains title and BEL", () => {
  const seq = osc.setTitle("test");
  assertEquals(seq.includes("test"), true);
  assertEquals(seq.includes("\x07"), true);
});

Deno.test("osc.hyperlink contains url and text", () => {
  const seq = osc.hyperlink("url", "text");
  assertEquals(seq.includes("url"), true);
  assertEquals(seq.includes("text"), true);
});

Deno.test("osc.bell equals BEL character", () => {
  assertEquals(osc.bell, "\x07");
});

Deno.test("osc.notify contains message", () => {
  const seq = osc.notify("msg");
  assertEquals(seq.includes("msg"), true);
});
