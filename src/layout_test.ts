import { assertEquals } from "@std/assert";
import { Center, Column, Flex, Grid, Padding, Row } from "./layout.ts";
import { Text } from "./components.ts";
import { Canvas } from "./canvas.ts";

Deno.test("Row renders children horizontally", () => {
  const canvas = new Canvas(20, 5);
  const row = Row([
    { component: Text("A"), width: 5 },
    { component: Text("B"), width: 5 },
  ]);

  row.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(5, 0)?.char, "B");
});

Deno.test("Row respects gap", () => {
  const canvas = new Canvas(20, 5);
  const row = Row(
    [
      { component: Text("A"), width: 3 },
      { component: Text("B"), width: 3 },
    ],
    { gap: 2 },
  );

  row.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(5, 0)?.char, "B"); // 3 width + 2 gap = 5
});

Deno.test("Column renders children vertically", () => {
  const canvas = new Canvas(20, 10);
  const column = Column([
    { component: Text("A"), height: 2 },
    { component: Text("B"), height: 2 },
  ]);

  column.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(0, 2)?.char, "B");
});

Deno.test("Flex distributes space with flex factor", () => {
  const canvas = new Canvas(20, 5);
  const flex = Flex({
    direction: "row",
    children: [
      { component: Text("A"), flex: 1 },
      { component: Text("B"), flex: 1 },
    ],
  });

  flex.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(10, 0)?.char, "B"); // Half of 20
});

Deno.test("Flex respects fixed width over flex", () => {
  const canvas = new Canvas(20, 5);
  const flex = Flex({
    direction: "row",
    children: [
      { component: Text("A"), width: 5 },
      { component: Text("B"), flex: 1 },
    ],
  });

  flex.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(5, 0)?.char, "B"); // Starts right after fixed width
});

Deno.test("Grid renders in columns", () => {
  const canvas = new Canvas(20, 10);
  const grid = Grid({
    columns: 2,
    gap: 0,
    children: [Text("A"), Text("B"), Text("C"), Text("D")],
  });

  grid.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(10, 0)?.char, "B"); // Second column
  assertEquals(canvas.get(0, 5)?.char, "C"); // Second row
  assertEquals(canvas.get(10, 5)?.char, "D");
});

Deno.test("Padding adds space around child", () => {
  const canvas = new Canvas(20, 10);
  const padded = Padding({
    padding: 2,
    child: Text("X"),
  });

  padded.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  assertEquals(canvas.get(0, 0)?.char, " "); // Padding
  assertEquals(canvas.get(2, 2)?.char, "X"); // Content offset by padding
});

Deno.test("Center centers child", () => {
  const canvas = new Canvas(20, 10);
  const centered = Center({
    child: Text("X"),
    width: 1,
    height: 1,
  });

  centered.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // Center of 20x10 with 1x1 content = (9, 4)
  assertEquals(canvas.get(9, 4)?.char, "X");
});

Deno.test("Row with justify end", () => {
  const canvas = new Canvas(20, 5);
  const row = Row(
    [{ component: Text("A"), width: 5 }],
    { justify: "end" },
  );

  row.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(15, 0)?.char, "A"); // Pushed to end
});

Deno.test("Row with justify center", () => {
  const canvas = new Canvas(20, 5);
  const row = Row(
    [{ component: Text("X"), width: 2 }],
    { justify: "center" },
  );

  row.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(9, 0)?.char, "X"); // Centered
});
