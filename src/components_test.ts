import { assertEquals } from "@std/assert";
import {
  Badge,
  Box,
  buildStyle,
  colors,
  Divider,
  FocusContainer,
  List,
  Progress,
  ScrollBox,
  Spinner,
  Table,
  Text,
  TextInput,
} from "./components.ts";
import { Canvas } from "./canvas.ts";

Deno.test("buildStyle combines style properties", () => {
  assertEquals(buildStyle({}), "");
  assertEquals(buildStyle({ bold: true }).includes("\x1b[1m"), true);
  assertEquals(buildStyle({ fg: colors.fg.red }), "");
  assertEquals(buildStyle({ bold: true, fg: colors.fg.red }), "\x1b[1m");
  assertEquals(
    buildStyle({ bold: true, italic: true }),
    "\x1b[1m\x1b[3m",
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

// Spinner tests

Deno.test("Spinner renders correct braille frame and label", () => {
  const canvas = new Canvas(20, 1);
  const spinner = Spinner({ frame: 0, label: "Loading" });

  spinner.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "⠋"); // First frame
  assertEquals(canvas.get(2, 0)?.char, "L");
  assertEquals(canvas.get(3, 0)?.char, "o");
});

Deno.test("Spinner frame wraps around", () => {
  const canvas = new Canvas(20, 1);
  // 10 frames total, frame 12 should wrap to frame 2
  const spinner = Spinner({ frame: 12 });

  spinner.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "⠹"); // Frame index 2
});

// Table tests

Deno.test("Table renders headers and rows", () => {
  const canvas = new Canvas(40, 5);
  const table = Table({
    headers: ["Name", "Age"],
    rows: [["Alice", "30"], ["Bob", "25"]],
  });

  table.render(canvas, { x: 0, y: 0, width: 40, height: 5 });

  // Header row
  assertEquals(canvas.get(0, 0)?.char, "N");
  assertEquals(canvas.get(1, 0)?.char, "a");
  // Separator line
  assertEquals(canvas.get(0, 1)?.char, "─");
  // Data rows
  assertEquals(canvas.get(0, 2)?.char, "A");
});

Deno.test("Table renders without border", () => {
  const canvas = new Canvas(40, 5);
  const table = Table({
    headers: ["Name", "Age"],
    rows: [["Alice", "30"]],
    border: false,
  });

  table.render(canvas, { x: 0, y: 0, width: 40, height: 5 });

  // No separator line - data starts at row 1
  assertEquals(canvas.get(0, 0)?.char, "N"); // Header
  assertEquals(canvas.get(0, 1)?.char, "A"); // First data row directly after header
});

Deno.test("Table respects custom column widths", () => {
  const canvas = new Canvas(40, 3);
  const table = Table({
    rows: [["Hi", "World"]],
    columnWidths: [10, 10],
    border: false,
  });

  table.render(canvas, { x: 0, y: 0, width: 40, height: 3 });

  assertEquals(canvas.get(0, 0)?.char, "H");
  assertEquals(canvas.get(1, 0)?.char, "i");
  // With columnWidth 10 and separatorWidth 1 (no border): next column at 11
  assertEquals(canvas.get(11, 0)?.char, "W");
});

// Divider tests

Deno.test("Divider renders horizontal line", () => {
  const canvas = new Canvas(10, 1);
  const divider = Divider();

  divider.render(canvas, { x: 0, y: 0, width: 10, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "─");
  assertEquals(canvas.get(5, 0)?.char, "─");
  assertEquals(canvas.get(9, 0)?.char, "─");
});

Deno.test("Divider renders vertical line", () => {
  const canvas = new Canvas(1, 5);
  const divider = Divider({ direction: "vertical" });

  divider.render(canvas, { x: 0, y: 0, width: 1, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "│");
  assertEquals(canvas.get(0, 2)?.char, "│");
  assertEquals(canvas.get(0, 4)?.char, "│");
});

Deno.test("Divider uses custom character", () => {
  const canvas = new Canvas(5, 1);
  const divider = Divider({ char: "=" });

  divider.render(canvas, { x: 0, y: 0, width: 5, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "=");
  assertEquals(canvas.get(4, 0)?.char, "=");
});

// Badge tests

Deno.test("Badge renders text with padding", () => {
  const canvas = new Canvas(20, 1);
  const badge = Badge({ text: "OK" });

  badge.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  // Badge renders " OK " (space + text + space)
  assertEquals(canvas.get(0, 0)?.char, " ");
  assertEquals(canvas.get(1, 0)?.char, "O");
  assertEquals(canvas.get(2, 0)?.char, "K");
  assertEquals(canvas.get(3, 0)?.char, " ");
});

Deno.test("Badge uses default colors", () => {
  const canvas = new Canvas(20, 1);
  const badge = Badge({ text: "X" });

  badge.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(1, 0)?.fg, colors.fg.black);
  assertEquals(canvas.get(1, 0)?.bg, colors.bg.white);
});

// TextInput tests

Deno.test("TextInput renders value", () => {
  const canvas = new Canvas(20, 1);
  const input = TextInput({ value: "hello", cursorPos: 5 });

  input.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "h");
  assertEquals(canvas.get(1, 0)?.char, "e");
  assertEquals(canvas.get(4, 0)?.char, "o");
});

Deno.test("TextInput renders placeholder when empty and not focused", () => {
  const canvas = new Canvas(20, 1);
  const input = TextInput({
    value: "",
    cursorPos: 0,
    placeholder: "Type here",
  });

  input.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "T");
  assertEquals(canvas.get(1, 0)?.char, "y");
});

Deno.test("TextInput shows cursor when focused", () => {
  const canvas = new Canvas(20, 1);
  const input = TextInput({ value: "ab", cursorPos: 1, focused: true });

  input.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  // Cursor at position 1 should have inverted style
  assertEquals(canvas.get(1, 0)?.char, "b");
  // Cursor position should have bg/fg set (inverted colors)
  assertEquals(canvas.get(1, 0)?.bg !== undefined, true);
});

Deno.test("TextInput scrolls for long text", () => {
  const canvas = new Canvas(5, 1);
  const input = TextInput({
    value: "abcdefghij",
    cursorPos: 9,
    width: 5,
  });

  input.render(canvas, { x: 0, y: 0, width: 5, height: 1 });

  // With cursor at 9 and width 5, visible portion starts at 5
  assertEquals(canvas.get(0, 0)?.char, "f");
  assertEquals(canvas.get(4, 0)?.char, "j");
});

// ScrollBox tests

Deno.test("ScrollBox renders border", () => {
  const canvas = new Canvas(10, 5);
  const scrollBox = ScrollBox({
    scrollY: 0,
    contentHeight: 10,
    child: Text("Content"),
  });

  scrollBox.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "┌");
  assertEquals(canvas.get(9, 0)?.char, "┐");
  assertEquals(canvas.get(0, 4)?.char, "└");
  assertEquals(canvas.get(9, 4)?.char, "┘");
});

Deno.test("ScrollBox renders scrollbar when content exceeds viewport", () => {
  const canvas = new Canvas(10, 5);
  const scrollBox = ScrollBox({
    scrollY: 0,
    contentHeight: 10,
    showScrollbar: true,
    child: Text("Content"),
  });

  scrollBox.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  // Scrollbar on right edge - should have either █ or ░
  const scrollbarCell = canvas.get(9, 1);
  assertEquals(
    scrollbarCell?.char === "█" || scrollbarCell?.char === "░",
    true,
  );
});

Deno.test("ScrollBox renders content", () => {
  const canvas = new Canvas(10, 5);
  const scrollBox = ScrollBox({
    scrollY: 0,
    contentHeight: 3,
    showScrollbar: false,
    child: Text("Hi"),
  });

  scrollBox.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  // Content inside border at (1, 1)
  assertEquals(canvas.get(1, 1)?.char, "H");
  assertEquals(canvas.get(2, 1)?.char, "i");
});

// FocusContainer tests

Deno.test("FocusContainer renders items vertically", () => {
  const canvas = new Canvas(20, 5);
  const container = FocusContainer({
    items: [
      { id: "a", component: Text("Item A") },
      { id: "b", component: Text("Item B") },
    ],
    focusedId: "a",
  });

  container.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "I"); // Item A at row 0
  assertEquals(canvas.get(0, 1)?.char, "I"); // Item B at row 1
});

Deno.test("FocusContainer shows focus indicator", () => {
  const canvas = new Canvas(20, 5);
  const container = FocusContainer({
    items: [
      { id: "a", component: Text("Item A") },
      { id: "b", component: Text("Item B") },
    ],
    focusedId: "a",
    focusedStyle: { fg: colors.fg.cyan },
  });

  container.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  // Focused item gets "▸" indicator
  assertEquals(canvas.get(0, 0)?.char, "▸");
  // Text is offset by 2 for the indicator
  assertEquals(canvas.get(2, 0)?.char, "I");
});

Deno.test("FocusContainer renders items horizontally", () => {
  const canvas = new Canvas(20, 1);
  const container = FocusContainer({
    items: [
      { id: "a", component: Text("A") },
      { id: "b", component: Text("B") },
    ],
    focusedId: "a",
    direction: "horizontal",
  });

  container.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(10, 0)?.char, "B"); // Second item at half width
});

// truncateText/padOrTruncate with CJK

Deno.test("Text truncates CJK text correctly", () => {
  const canvas = new Canvas(6, 1);
  // "你好世界" = 8 display width, truncate to 6 => "你好…" (4+1=5 ≤ 6)
  const text = Text("你好世界");
  text.render(canvas, { x: 0, y: 0, width: 6, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "你");
  assertEquals(canvas.get(2, 0)?.char, "好");
  assertEquals(canvas.get(4, 0)?.char, "…");
});

// Table column separators

Deno.test("Table renders column separators", () => {
  const canvas = new Canvas(40, 5);
  const table = Table({
    headers: ["Name", "Age"],
    rows: [["Alice", "30"]],
    border: true,
  });

  table.render(canvas, { x: 0, y: 0, width: 40, height: 5 });

  // Find the separator character between columns in header row
  // Column widths are auto-calculated. Separator is at colWidth + 1
  // We need to find a "│" character in row 0
  let foundHeaderSep = false;
  let foundDataSep = false;
  let foundCrossSep = false;
  for (let x = 0; x < 40; x++) {
    if (canvas.get(x, 0)?.char === "│") foundHeaderSep = true;
    if (canvas.get(x, 1)?.char === "┼") foundCrossSep = true;
    if (canvas.get(x, 2)?.char === "│") foundDataSep = true;
  }
  assertEquals(foundHeaderSep, true);
  assertEquals(foundCrossSep, true);
  assertEquals(foundDataSep, true);
});

// TextInput cursor colors

Deno.test("TextInput cursor uses correct fg/bg color families", () => {
  const canvas = new Canvas(20, 1);
  const input = TextInput({ value: "ab", cursorPos: 0, focused: true });

  input.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  const cell = canvas.get(0, 0);
  // Default cursor: fg should be a FG code (contains "3" in SGR param), bg should be BG code
  // colors.fg.black = \x1b[30m, colors.bg.white = \x1b[47m
  assertEquals(cell?.fg, colors.fg.black);
  assertEquals(cell?.bg, colors.bg.white);
});

// ScrollBox clipping

Deno.test("ScrollBox clips content outside viewport", () => {
  const canvas = new Canvas(12, 6);
  // Content extends above viewport when scrolled
  const scrollBox = ScrollBox({
    scrollY: 2,
    contentHeight: 10,
    showScrollbar: false,
    child: Text({ content: "Line0\nLine1\nLine2\nLine3\nLine4", wrap: true }),
  });

  scrollBox.render(canvas, { x: 0, y: 0, width: 12, height: 6 });

  // Border should still be intact
  assertEquals(canvas.get(0, 0)?.char, "┌");
  assertEquals(canvas.get(0, 5)?.char, "└");
  // Content above the viewport should NOT overwrite the border
  // (y=0 is the top border, clip starts at y=1)
});

// FocusContainer with custom itemHeight

Deno.test("FocusContainer uses custom itemHeight", () => {
  const canvas = new Canvas(20, 10);
  const container = FocusContainer({
    items: [
      { id: "a", component: Text("Item A") },
      { id: "b", component: Text("Item B") },
    ],
    focusedId: "a",
    itemHeight: 3,
  });

  container.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // Item A at row 0
  assertEquals(canvas.get(0, 0)?.char, "I");
  // Item B at row 3 (itemHeight=3, no gap)
  assertEquals(canvas.get(0, 3)?.char, "I");
});
