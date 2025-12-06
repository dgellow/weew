import { assertEquals } from "@std/assert";
import { Box, buildStyle, colors, List, Progress, Text } from "./components.ts";
import { Canvas } from "./canvas.ts";

Deno.test("buildStyle combines style properties", () => {
  assertEquals(buildStyle({}), "");
  assertEquals(buildStyle({ bold: true }).includes("\x1b[1m"), true);
  assertEquals(buildStyle({ fg: colors.fg.red }), colors.fg.red);
  assertEquals(
    buildStyle({ bold: true, fg: colors.fg.red }),
    "\x1b[1m" + colors.fg.red,
  );
});

Deno.test("colors.fg.hex converts hex to RGB", () => {
  const red = colors.fg.hex("#ff0000");
  assertEquals(red.includes("255"), true);
  assertEquals(red.includes(";0;0m"), true);
});

Deno.test("colors.bg.hex converts hex to RGB", () => {
  const blue = colors.bg.hex("#0000ff");
  assertEquals(blue.includes("0;0;255"), true);
});

Deno.test("Text component renders simple string", () => {
  const canvas = new Canvas(20, 5);
  const text = Text("Hello");

  text.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "H");
  assertEquals(canvas.get(1, 0)?.char, "e");
  assertEquals(canvas.get(4, 0)?.char, "o");
});

Deno.test("Text component renders with alignment", () => {
  const canvas = new Canvas(20, 5);
  const text = Text({ content: "Hi", align: "right" });

  text.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(18, 0)?.char, "H");
  assertEquals(canvas.get(19, 0)?.char, "i");
});

Deno.test("Text component renders centered", () => {
  const canvas = new Canvas(10, 1);
  const text = Text({ content: "Hi", align: "center" });

  text.render(canvas, { x: 0, y: 0, width: 10, height: 1 });

  assertEquals(canvas.get(4, 0)?.char, "H");
  assertEquals(canvas.get(5, 0)?.char, "i");
});

Deno.test("Box component renders border", () => {
  const canvas = new Canvas(10, 5);
  const box = Box({ border: "single" });

  box.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "┌");
  assertEquals(canvas.get(9, 0)?.char, "┐");
  assertEquals(canvas.get(0, 4)?.char, "└");
  assertEquals(canvas.get(9, 4)?.char, "┘");
  assertEquals(canvas.get(1, 0)?.char, "─");
  assertEquals(canvas.get(0, 1)?.char, "│");
});

Deno.test("Box component renders rounded border", () => {
  const canvas = new Canvas(10, 5);
  const box = Box({ border: "rounded" });

  box.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "╭");
  assertEquals(canvas.get(9, 0)?.char, "╮");
  assertEquals(canvas.get(0, 4)?.char, "╰");
  assertEquals(canvas.get(9, 4)?.char, "╯");
});

Deno.test("Box component renders child", () => {
  const canvas = new Canvas(10, 5);
  const box = Box({
    border: "single",
    child: Text("Hi"),
  });

  box.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  assertEquals(canvas.get(1, 1)?.char, "H");
  assertEquals(canvas.get(2, 1)?.char, "i");
});

Deno.test("Box component renders title", () => {
  const canvas = new Canvas(20, 5);
  const box = Box({
    border: "single",
    title: "Test",
  });

  box.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(3, 0)?.char, "T");
  assertEquals(canvas.get(4, 0)?.char, "e");
  assertEquals(canvas.get(5, 0)?.char, "s");
  assertEquals(canvas.get(6, 0)?.char, "t");
});

Deno.test("Progress component renders bar", () => {
  const canvas = new Canvas(20, 1);
  const progress = Progress({ value: 50, width: 10 });

  progress.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "█");
  assertEquals(canvas.get(4, 0)?.char, "█");
  assertEquals(canvas.get(5, 0)?.char, "░");
  assertEquals(canvas.get(9, 0)?.char, "░");
});

Deno.test("Progress component clamps values", () => {
  const canvas = new Canvas(10, 1);
  const progress = Progress({ value: 150, width: 10 });

  progress.render(canvas, { x: 0, y: 0, width: 10, height: 1 });

  // All filled at 100%
  assertEquals(canvas.get(9, 0)?.char, "█");
});

Deno.test("List component renders items", () => {
  const canvas = new Canvas(20, 5);
  const list = List({
    items: ["One", "Two", "Three"],
  });

  list.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "•");
  assertEquals(canvas.get(2, 0)?.char, "O");
  assertEquals(canvas.get(0, 1)?.char, "•");
  assertEquals(canvas.get(2, 1)?.char, "T");
});

Deno.test("List component shows selected item", () => {
  const canvas = new Canvas(20, 5);
  const list = List({
    items: ["One", "Two"],
    selected: 1,
  });

  list.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "•"); // Not selected
  assertEquals(canvas.get(0, 1)?.char, "›"); // Selected indicator
});
