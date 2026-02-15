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

// ============================================================
// Additional layout tests
// ============================================================

Deno.test("Flex justify:between distributes space between children", () => {
  const canvas = new Canvas(20, 1);
  const flex = Flex({
    direction: "row",
    justify: "between",
    children: [
      { component: Text("A"), width: 1 },
      { component: Text("B"), width: 1 },
      { component: Text("C"), width: 1 },
    ],
  });
  flex.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  // First at start, last at end
  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(19, 0)?.char, "C");
});

Deno.test("Flex justify:around adds space around children", () => {
  const canvas = new Canvas(20, 1);
  const flex = Flex({
    direction: "row",
    justify: "around",
    children: [
      { component: Text("A"), width: 1 },
      { component: Text("B"), width: 1 },
    ],
  });
  flex.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  // 20 total, 2 used, 18 extra
  // spacing = 18/2 = 9, initialOffset = 9/2 = 4.5 => floor(4.5) = 4
  assertEquals(canvas.get(0, 0)?.char, " ");
  assertEquals(canvas.get(4, 0)?.char, "A");
});

Deno.test("Flex justify:evenly distributes space evenly", () => {
  const canvas = new Canvas(20, 1);
  const flex = Flex({
    direction: "row",
    justify: "evenly",
    children: [
      { component: Text("A"), width: 1 },
      { component: Text("B"), width: 1 },
    ],
  });
  flex.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  // 20 total, 2 used, 18 extra, spacing = 18/3 = 6, initialOffset = 6
  assertEquals(canvas.get(6, 0)?.char, "A");
});

Deno.test("Flex align:end positions on cross axis end", () => {
  const canvas = new Canvas(20, 10);
  const flex = Flex({
    direction: "row",
    align: "end",
    children: [
      { component: Text("A"), width: 1, height: 1 },
    ],
  });
  flex.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // Cross axis (height=10), child height=1, align end => y = 10 - 1 = 9
  assertEquals(canvas.get(0, 9)?.char, "A");
});

Deno.test("Flex align:center positions on cross axis center", () => {
  const canvas = new Canvas(20, 10);
  const flex = Flex({
    direction: "row",
    align: "center",
    children: [
      { component: Text("A"), width: 1, height: 2 },
    ],
  });
  flex.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // Cross axis center: (10-2)/2 = 4
  assertEquals(canvas.get(0, 4)?.char, "A");
});

Deno.test("Flex with minWidth constraint", () => {
  const canvas = new Canvas(20, 1);
  const flex = Flex({
    direction: "row",
    children: [
      { component: Text("A"), flex: 1, minWidth: 15 },
      { component: Text("B"), flex: 1 },
    ],
  });
  flex.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  // Without constraint: 10 each. With minWidth 15: A gets 15, B gets 5
  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(15, 0)?.char, "B");
});

Deno.test("Flex with maxWidth constraint", () => {
  const canvas = new Canvas(20, 1);
  const flex = Flex({
    direction: "row",
    children: [
      { component: Text("A"), flex: 1, maxWidth: 5 },
      { component: Text("B"), flex: 1 },
    ],
  });
  flex.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  // A limited to 5, B gets 10 (its flex share, unclamped)
  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(5, 0)?.char, "B");
});

Deno.test("Grid with gap separates cells", () => {
  const canvas = new Canvas(20, 10);
  const grid = Grid({
    columns: 2,
    gap: 2,
    children: [Text("A"), Text("B"), Text("C"), Text("D")],
  });
  grid.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  // cellWidth = (20 - 1*2) / 2 = 9, second column at 0 + 1*(9+2) = 11
  assertEquals(canvas.get(11, 0)?.char, "B");
});

Deno.test("Grid with explicit rows limits rows rendered", () => {
  const canvas = new Canvas(20, 10);
  const grid = Grid({
    columns: 2,
    rows: 1,
    gap: 0,
    children: [Text("A"), Text("B"), Text("C"), Text("D")],
  });
  grid.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(10, 0)?.char, "B");
  // Row 2 should not be rendered (rows=1)
  assertEquals(canvas.get(0, 5)?.char, " ");
});

Deno.test("Padding with asymmetric object form", () => {
  const canvas = new Canvas(20, 10);
  const padded = Padding({
    padding: { top: 1, left: 3, bottom: 0, right: 0 },
    child: Text("X"),
  });
  padded.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // Content at (3, 1)
  assertEquals(canvas.get(0, 0)?.char, " ");
  assertEquals(canvas.get(3, 1)?.char, "X");
});

Deno.test("Column with gap separates children vertically", () => {
  const canvas = new Canvas(20, 10);
  const col = Column(
    [
      { component: Text("A"), height: 1 },
      { component: Text("B"), height: 1 },
    ],
    { gap: 2 },
  );
  col.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(0, 3)?.char, "B"); // 1 height + 2 gap = 3
});

Deno.test("Positioned with only x (no y) uses parent y", () => {
  const canvas = new Canvas(20, 10);
  const pos = Positioned({
    x: 5,
    width: 10,
    height: 1,
    child: Text("Hi"),
  });
  pos.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // y defaults to rect.y = 0
  assertEquals(canvas.get(5, 0)?.char, "H");
  assertEquals(canvas.get(6, 0)?.char, "i");
});

Deno.test("Positioned with only right/bottom anchors to edges", () => {
  const canvas = new Canvas(20, 10);
  const pos = Positioned({
    right: 2,
    bottom: 1,
    width: 3,
    height: 1,
    child: Text("End"),
  });
  pos.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // x = 20 - 3 - 2 = 15, y = 10 - 1 - 1 = 8
  assertEquals(canvas.get(15, 8)?.char, "E");
  assertEquals(canvas.get(16, 8)?.char, "n");
  assertEquals(canvas.get(17, 8)?.char, "d");
});

Deno.test("Stack with 3 children layers correctly", () => {
  const canvas = new Canvas(10, 1);
  const stack = Stack([
    Text("AAAA"),
    Text("BB"),
    Text("C"),
  ]);
  stack.render(canvas, { x: 0, y: 0, width: 10, height: 1 });

  // Last child overwrites at position 0
  assertEquals(canvas.get(0, 0)?.char, "C");
  // Position 1 has B from second child
  assertEquals(canvas.get(1, 0)?.char, "B");
  // Position 2 and 3 have A from first child
  assertEquals(canvas.get(2, 0)?.char, "A");
  assertEquals(canvas.get(3, 0)?.char, "A");
});

Deno.test("Center without explicit width/height uses parent dimensions", () => {
  const canvas = new Canvas(20, 10);
  const centered = Center({
    child: Text("X"),
  });
  centered.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // Without explicit width/height, uses rect.width and rect.height
  // So child renders at (0, 0) with full parent dimensions
  assertEquals(canvas.get(0, 0)?.char, "X");
});
