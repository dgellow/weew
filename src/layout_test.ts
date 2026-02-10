import { assertEquals } from "@std/assert";
import {
  Center,
  Column,
  Flex,
  Grid,
  Padding,
  Positioned,
  Row,
  Spacer,
  Stack,
} from "./layout.ts";
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

// Spacer tests

Deno.test("Spacer creates FlexChild with width and height", () => {
  const spacer = Spacer({ width: 5, height: 3 });

  assertEquals(spacer.width, 5);
  assertEquals(spacer.height, 3);
  assertEquals(spacer.component !== undefined, true);
});

Deno.test("Spacer creates FlexChild with flex", () => {
  const spacer = Spacer({ flex: 2 });

  assertEquals(spacer.flex, 2);
});

Deno.test("Spacer works in Row layout", () => {
  const canvas = new Canvas(20, 1);
  const row = Row([
    { component: Text("A"), width: 1 },
    Spacer({ width: 8 }),
    { component: Text("B"), width: 1 },
  ]);

  row.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(9, 0)?.char, "B"); // 1 + 8 = 9
});

Deno.test("Spacer with flex pushes items apart", () => {
  const canvas = new Canvas(20, 1);
  const row = Row([
    { component: Text("A"), width: 1 },
    Spacer({ flex: 1 }),
    { component: Text("B"), width: 1 },
  ]);

  row.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(19, 0)?.char, "B"); // Pushed to end
});

// Positioned tests

Deno.test("Positioned places child at x/y", () => {
  const canvas = new Canvas(20, 10);
  const pos = Positioned({
    x: 5,
    y: 3,
    width: 10,
    height: 1,
    child: Text("Hi"),
  });

  pos.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  assertEquals(canvas.get(5, 3)?.char, "H");
  assertEquals(canvas.get(6, 3)?.char, "i");
});

Deno.test("Positioned places child with right/bottom", () => {
  const canvas = new Canvas(20, 10);
  const pos = Positioned({
    right: 0,
    bottom: 0,
    width: 2,
    height: 1,
    child: Text("Hi"),
  });

  pos.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  assertEquals(canvas.get(18, 9)?.char, "H");
  assertEquals(canvas.get(19, 9)?.char, "i");
});

// Stack tests

Deno.test("Stack renders all children at same position", () => {
  const canvas = new Canvas(10, 1);
  const stack = Stack([
    Text("AB"),
    Text("X"),
  ]);

  stack.render(canvas, { x: 0, y: 0, width: 10, height: 1 });

  // Last child overwrites at position 0
  assertEquals(canvas.get(0, 0)?.char, "X");
  // Position 1 still has B from first child (not overwritten)
  assertEquals(canvas.get(1, 0)?.char, "B");
});

Deno.test("Flex clamps negative available space", () => {
  const canvas = new Canvas(10, 5);
  // Two fixed children that exceed the container
  const flex = Flex({
    direction: "row",
    children: [
      { component: Text("A"), width: 8 },
      { component: Text("B"), width: 8 },
      { component: Text("C"), flex: 1 },
    ],
  });

  flex.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  // Should not crash. Flex child C gets size 0, not negative.
  assertEquals(canvas.get(0, 0)?.char, "A");
});
