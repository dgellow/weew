import { assertEquals } from "@std/assert";
import { Canvas } from "./canvas.ts";

Deno.test("Canvas constructor creates correct size", () => {
  const canvas = new Canvas(10, 5);
  assertEquals(canvas.width, 10);
  assertEquals(canvas.height, 5);
});

Deno.test("Canvas.set and Canvas.get work correctly", () => {
  const canvas = new Canvas(10, 5);

  canvas.set(0, 0, { char: "A" });
  assertEquals(canvas.get(0, 0)?.char, "A");

  canvas.set(5, 2, { char: "B", fg: "red" });
  assertEquals(canvas.get(5, 2)?.char, "B");
  assertEquals(canvas.get(5, 2)?.fg, "red");
});

Deno.test("Canvas.set ignores out of bounds", () => {
  const canvas = new Canvas(10, 5);

  canvas.set(-1, 0, { char: "X" });
  canvas.set(10, 0, { char: "X" });
  canvas.set(0, -1, { char: "X" });
  canvas.set(0, 5, { char: "X" });

  assertEquals(canvas.get(-1, 0), undefined);
  assertEquals(canvas.get(10, 0), undefined);
});

Deno.test("Canvas.text writes text at position", () => {
  const canvas = new Canvas(20, 5);

  canvas.text(0, 0, "Hello");

  assertEquals(canvas.get(0, 0)?.char, "H");
  assertEquals(canvas.get(1, 0)?.char, "e");
  assertEquals(canvas.get(2, 0)?.char, "l");
  assertEquals(canvas.get(3, 0)?.char, "l");
  assertEquals(canvas.get(4, 0)?.char, "o");
});

Deno.test("Canvas.clear resets all cells", () => {
  const canvas = new Canvas(10, 5);

  canvas.set(0, 0, { char: "A" });
  canvas.clear();

  assertEquals(canvas.get(0, 0)?.char, " ");
});

Deno.test("Canvas.resize changes dimensions", () => {
  const canvas = new Canvas(10, 5);

  canvas.resize(20, 10);

  assertEquals(canvas.width, 20);
  assertEquals(canvas.height, 10);
});

Deno.test("Canvas.fill fills rectangle", () => {
  const canvas = new Canvas(10, 5);

  canvas.fill(1, 1, 3, 2, "#");

  assertEquals(canvas.get(1, 1)?.char, "#");
  assertEquals(canvas.get(2, 1)?.char, "#");
  assertEquals(canvas.get(3, 1)?.char, "#");
  assertEquals(canvas.get(1, 2)?.char, "#");
  assertEquals(canvas.get(2, 2)?.char, "#");
  assertEquals(canvas.get(3, 2)?.char, "#");
  assertEquals(canvas.get(0, 0)?.char, " ");
});

Deno.test("Canvas.hline draws horizontal line", () => {
  const canvas = new Canvas(10, 5);

  canvas.hline(0, 0, 5, "-");

  assertEquals(canvas.get(0, 0)?.char, "-");
  assertEquals(canvas.get(4, 0)?.char, "-");
  assertEquals(canvas.get(5, 0)?.char, " ");
});

Deno.test("Canvas.vline draws vertical line", () => {
  const canvas = new Canvas(10, 5);

  canvas.vline(0, 0, 3, "|");

  assertEquals(canvas.get(0, 0)?.char, "|");
  assertEquals(canvas.get(0, 2)?.char, "|");
  assertEquals(canvas.get(0, 3)?.char, " ");
});

Deno.test("Canvas.text handles emoji (wide characters)", () => {
  const canvas = new Canvas(20, 5);

  canvas.text(0, 0, "🎉Hi");

  // Emoji takes 2 cells
  assertEquals(canvas.get(0, 0)?.char, "🎉");
  assertEquals(canvas.get(1, 0)?.char, ""); // Placeholder for wide char
  assertEquals(canvas.get(2, 0)?.char, "H");
  assertEquals(canvas.get(3, 0)?.char, "i");
});

Deno.test("Canvas.text handles CJK characters", () => {
  const canvas = new Canvas(20, 5);

  canvas.text(0, 0, "你好");

  assertEquals(canvas.get(0, 0)?.char, "你");
  assertEquals(canvas.get(1, 0)?.char, ""); // Placeholder
  assertEquals(canvas.get(2, 0)?.char, "好");
  assertEquals(canvas.get(3, 0)?.char, ""); // Placeholder
});

Deno.test("Canvas.text handles mixed ASCII and emoji", () => {
  const canvas = new Canvas(20, 5);

  canvas.text(0, 0, "Hi🎉!");

  assertEquals(canvas.get(0, 0)?.char, "H");
  assertEquals(canvas.get(1, 0)?.char, "i");
  assertEquals(canvas.get(2, 0)?.char, "🎉");
  assertEquals(canvas.get(3, 0)?.char, ""); // Placeholder
  assertEquals(canvas.get(4, 0)?.char, "!");
});

Deno.test("Canvas.pushClip/popClip enforces clip bounds", () => {
  const canvas = new Canvas(10, 10);

  canvas.pushClip({ x: 2, y: 2, width: 4, height: 4 });

  // Inside clip region - should work
  canvas.set(2, 2, { char: "A" });
  canvas.set(5, 5, { char: "B" });
  assertEquals(canvas.get(2, 2)?.char, "A");
  assertEquals(canvas.get(5, 5)?.char, "B");

  // Outside clip region - should be ignored
  canvas.set(0, 0, { char: "X" });
  canvas.set(6, 6, { char: "Y" });
  canvas.set(1, 3, { char: "Z" });
  assertEquals(canvas.get(0, 0)?.char, " "); // Not set
  assertEquals(canvas.get(6, 6)?.char, " "); // Not set
  assertEquals(canvas.get(1, 3)?.char, " "); // Not set

  canvas.popClip();

  // After pop, should work everywhere again
  canvas.set(0, 0, { char: "X" });
  assertEquals(canvas.get(0, 0)?.char, "X");
});

Deno.test("Canvas.clear resets cells with styles", () => {
  const canvas = new Canvas(5, 3);

  canvas.set(0, 0, { char: "A", fg: "red", bg: "blue", style: "bold" });
  assertEquals(canvas.get(0, 0)?.fg, "red");

  canvas.clear();

  assertEquals(canvas.get(0, 0)?.char, " ");
  assertEquals(canvas.get(0, 0)?.fg, undefined);
  assertEquals(canvas.get(0, 0)?.bg, undefined);
  assertEquals(canvas.get(0, 0)?.style, undefined);
});

Deno.test("Canvas.pushClip nested clips", () => {
  const canvas = new Canvas(10, 10);

  canvas.pushClip({ x: 1, y: 1, width: 8, height: 8 });
  canvas.pushClip({ x: 3, y: 3, width: 4, height: 4 });

  // Inside inner clip - should work
  canvas.set(4, 4, { char: "A" });
  assertEquals(canvas.get(4, 4)?.char, "A");

  // Inside outer but outside inner - should be clipped
  canvas.set(2, 2, { char: "B" });
  assertEquals(canvas.get(2, 2)?.char, " ");

  canvas.popClip();

  // After popping inner, outer clip applies
  canvas.set(2, 2, { char: "C" });
  assertEquals(canvas.get(2, 2)?.char, "C");

  // Outside outer clip - still clipped
  canvas.set(0, 0, { char: "D" });
  assertEquals(canvas.get(0, 0)?.char, " ");

  canvas.popClip();
});
