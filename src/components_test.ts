import { assertEquals } from "@std/assert";
import {
  Badge,
  Box,
  buildStyle,
  Checkbox,
  colors,
  Dialog,
  Divider,
  FocusContainer,
  List,
  Progress,
  scrollbarPosition,
  ScrollBox,
  Select,
  Spinner,
  Table,
  Tabs,
  Text,
  TextInput,
  Toast,
  Tree,
  VirtualList,
  VirtualScrollBox,
} from "./components.ts";
import type { Rect, VisibleRange } from "./components.ts";
import { Canvas } from "./canvas.ts";
import type { KeyEvent } from "./input.ts";
import { handleFocusGroup } from "./focus.ts";

function key(
  k: string,
  mods: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {},
): KeyEvent {
  return {
    key: k,
    ctrl: mods.ctrl ?? false,
    alt: mods.alt ?? false,
    shift: mods.shift ?? false,
    meta: false,
    raw: new Uint8Array(),
  };
}

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

// scrollbarPosition utility

Deno.test("scrollbarPosition calculates thumb position at top", () => {
  const info = scrollbarPosition({
    contentHeight: 100,
    viewportHeight: 10,
    scrollY: 0,
  });
  assertEquals(info.thumbPos, 0);
  assertEquals(info.thumbSize, 1);
});

Deno.test("scrollbarPosition calculates thumb position at bottom", () => {
  const info = scrollbarPosition({
    contentHeight: 100,
    viewportHeight: 10,
    scrollY: 90,
  });
  assertEquals(info.thumbPos, 9); // thumbSize=1, pos = 9
});

Deno.test("scrollbarPosition calculates proportional thumb size", () => {
  const info = scrollbarPosition({
    contentHeight: 20,
    viewportHeight: 10,
    scrollY: 0,
  });
  assertEquals(info.thumbSize, 5); // 10/20 * 10 = 5
});

// VirtualScrollBox tests

Deno.test("VirtualScrollBox renders border", () => {
  const canvas = new Canvas(10, 5);
  const vsb = VirtualScrollBox({
    scrollY: 0,
    contentHeight: 10,
    renderSlice(_canvas: Canvas, _rect: Rect, _range: VisibleRange) {},
  });

  vsb.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "┌");
  assertEquals(canvas.get(9, 0)?.char, "┐");
  assertEquals(canvas.get(0, 4)?.char, "└");
  assertEquals(canvas.get(9, 4)?.char, "┘");
});

Deno.test("VirtualScrollBox passes correct visible range", () => {
  const canvas = new Canvas(12, 6);
  let capturedRange: VisibleRange | null = null;

  const vsb = VirtualScrollBox({
    scrollY: 5,
    contentHeight: 20,
    showScrollbar: false,
    renderSlice(_canvas: Canvas, _rect: Rect, range: VisibleRange) {
      capturedRange = range;
    },
  });

  vsb.render(canvas, { x: 0, y: 0, width: 12, height: 6 });

  // Viewport height = 6 - 2 (borders) = 4
  // scrollY = 5, so start = 5, end = min(20, 5+4) = 9
  assertEquals(capturedRange!.start, 5);
  assertEquals(capturedRange!.end, 9);
});

Deno.test("VirtualScrollBox only renders visible content", () => {
  const canvas = new Canvas(20, 7);
  let renderCount = 0;

  const vsb = VirtualScrollBox({
    scrollY: 0,
    contentHeight: 100,
    showScrollbar: false,
    border: "none",
    renderSlice(c: Canvas, rect: Rect, range: VisibleRange) {
      for (let i = range.start; i < range.end; i++) {
        c.text(rect.x, rect.y + (i - range.start), `Line ${i}`);
        renderCount++;
      }
    },
  });

  vsb.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  // With no border, viewport = 7 lines, so only 7 lines rendered
  assertEquals(renderCount, 7);
  assertEquals(canvas.get(0, 0)?.char, "L");
});

// VirtualList tests

Deno.test("VirtualList renders visible items only", () => {
  const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
  const renderedIndices: number[] = [];

  const canvas = new Canvas(20, 7);
  const vlist = VirtualList({
    items,
    scrollY: 0,
    showScrollbar: false,
    border: "none",
    renderItem: (_item: string, index: number, _selected: boolean) => {
      renderedIndices.push(index);
      return Text(`Item ${index}`);
    },
  });

  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  // Only 7 visible items should be rendered (viewport = 7, no border)
  assertEquals(renderedIndices.length, 7);
  assertEquals(renderedIndices[0], 0);
  assertEquals(renderedIndices[6], 6);
});

Deno.test("VirtualList passes selected state to renderItem", () => {
  const items = ["A", "B", "C"];
  const selectedStates: boolean[] = [];

  const canvas = new Canvas(20, 5);
  const vlist = VirtualList({
    items,
    selected: 1,
    scrollY: 0,
    showScrollbar: false,
    border: "none",
    renderItem: (_item: string, _index: number, selected: boolean) => {
      selectedStates.push(selected);
      return Text("x");
    },
  });

  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(selectedStates, [false, true, false]);
});

Deno.test("VirtualList with scrollY renders correct slice", () => {
  const items = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
  const renderedIndices: number[] = [];

  const canvas = new Canvas(20, 5);
  const vlist = VirtualList({
    items,
    scrollY: 10,
    showScrollbar: false,
    border: "none",
    renderItem: (_item: string, index: number, _selected: boolean) => {
      renderedIndices.push(index);
      return Text(`Item ${index}`);
    },
  });

  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(renderedIndices[0], 10);
  assertEquals(renderedIndices.length, 5);
});

// Canvas toString tests

Deno.test("Canvas.toString returns plain text grid", () => {
  const canvas = new Canvas(5, 2);
  canvas.text(0, 0, "Hello");
  canvas.text(0, 1, "World");

  const text = canvas.toString();
  const lines = text.split("\n");
  assertEquals(lines[0], "Hello");
  assertEquals(lines[1], "World");
});

Deno.test("Canvas.regionToString returns sub-region", () => {
  const canvas = new Canvas(10, 5);
  canvas.text(2, 1, "AB");
  canvas.text(2, 2, "CD");

  const region = canvas.regionToString(2, 1, 2, 2);
  assertEquals(region, "AB\nCD");
});

// Dialog tests

Deno.test("Dialog renders centered box with border", () => {
  const canvas = new Canvas(20, 10);
  const dialog = Dialog({
    title: "Hi",
    width: 10,
    height: 5,
    child: Text("OK"),
  });

  dialog.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // Dialog centered: x = (20-10)/2 = 5, y = (10-5)/2 = 2
  assertEquals(canvas.get(5, 2)?.char, "╭"); // rounded border default
  assertEquals(canvas.get(14, 2)?.char, "╮");
  // Content inside
  assertEquals(canvas.get(6, 3)?.char, "O");
  assertEquals(canvas.get(7, 3)?.char, "K");
});

// Tabs tests

Deno.test("Tabs renders tab labels and active content", () => {
  const canvas = new Canvas(30, 10);
  const tabs = Tabs({
    tabs: [
      { id: "a", label: "Tab A", content: Text("Content A") },
      { id: "b", label: "Tab B", content: Text("Content B") },
    ],
    activeTab: "a",
  });

  tabs.render(canvas, { x: 0, y: 0, width: 30, height: 10 });

  // Tab labels on row 0
  assertEquals(canvas.get(1, 0)?.char, "T"); // " Tab A " starts at x=0
  // Active tab content below (row 2)
  assertEquals(canvas.get(0, 2)?.char, "C");
  assertEquals(canvas.get(1, 2)?.char, "o");
});

Deno.test("Tabs renders correct content for active tab", () => {
  const canvas = new Canvas(30, 10);
  const tabs = Tabs({
    tabs: [
      { id: "a", label: "Tab A", content: Text("AAA") },
      { id: "b", label: "Tab B", content: Text("BBB") },
    ],
    activeTab: "b",
  });

  tabs.render(canvas, { x: 0, y: 0, width: 30, height: 10 });

  // Content for tab B
  assertEquals(canvas.get(0, 2)?.char, "B");
});

// Select tests

Deno.test("Select renders closed state", () => {
  const canvas = new Canvas(20, 5);
  const select = Select({
    options: ["Red", "Green", "Blue"],
    selected: 1,
  });

  select.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "▸"); // closed indicator
  assertEquals(canvas.get(2, 0)?.char, "G"); // "Green"
});

Deno.test("Select renders open state with options", () => {
  const canvas = new Canvas(20, 10);
  const select = Select({
    options: ["Red", "Green", "Blue"],
    selected: 1,
    open: true,
  });

  select.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  assertEquals(canvas.get(0, 0)?.char, "▾"); // open indicator
  // Options listed below
  assertEquals(canvas.get(2, 1)?.char, "R"); // Red (not selected, so "  R...")
  assertEquals(canvas.get(2, 2)?.char, "G"); // Green (selected, "› G...")
  assertEquals(canvas.get(0, 2)?.char, "›"); // selected indicator
});

// Checkbox tests

Deno.test("Checkbox renders unchecked", () => {
  const canvas = new Canvas(20, 1);
  const cb = Checkbox({ checked: false, label: "Accept" });

  cb.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "[");
  assertEquals(canvas.get(1, 0)?.char, " ");
  assertEquals(canvas.get(2, 0)?.char, "]");
  assertEquals(canvas.get(4, 0)?.char, "A"); // label
});

Deno.test("Checkbox renders checked", () => {
  const canvas = new Canvas(20, 1);
  const cb = Checkbox({ checked: true, label: "Accept" });

  cb.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  assertEquals(canvas.get(1, 0)?.char, "✓");
});

// Tree tests

Deno.test("Tree renders flat nodes", () => {
  const canvas = new Canvas(20, 5);
  const tree = Tree({
    nodes: [
      { label: "A" },
      { label: "B" },
      { label: "C" },
    ],
  });

  tree.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(2, 0)?.char, "A");
  assertEquals(canvas.get(2, 1)?.char, "B");
  assertEquals(canvas.get(2, 2)?.char, "C");
});

Deno.test("Tree renders expanded children with indent", () => {
  const canvas = new Canvas(20, 5);
  const tree = Tree({
    nodes: [
      {
        label: "Parent",
        expanded: true,
        children: [
          { label: "Child" },
        ],
      },
    ],
  });

  tree.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  // Parent has "▾ " prefix
  assertEquals(canvas.get(0, 0)?.char, "▾");
  assertEquals(canvas.get(2, 0)?.char, "P");
  // Child indented by 2 (default indent) + "  " prefix
  assertEquals(canvas.get(4, 1)?.char, "C");
});

Deno.test("Tree hides collapsed children", () => {
  const canvas = new Canvas(20, 5);
  const tree = Tree({
    nodes: [
      {
        label: "Parent",
        expanded: false,
        children: [
          { label: "Child" },
        ],
      },
      { label: "Sibling" },
    ],
  });

  tree.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  // Parent at row 0, Sibling at row 1 (child hidden)
  assertEquals(canvas.get(0, 0)?.char, "▸"); // collapsed indicator
  assertEquals(canvas.get(2, 1)?.char, "S"); // Sibling
});

// Toast tests

Deno.test("Toast renders centered at top", () => {
  const canvas = new Canvas(20, 5);
  const toast = Toast({ message: "OK" });

  toast.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  // Toast at top (y=0), centered
  // Width = min(2+4, 20) = 6, x = (20-6)/2 = 7
  // Text centered in the 6-wide bar
  assertEquals(canvas.get(9, 0)?.char, "O");
  assertEquals(canvas.get(10, 0)?.char, "K");
});

Deno.test("Toast renders at bottom", () => {
  const canvas = new Canvas(20, 5);
  const toast = Toast({ message: "OK", position: "bottom" });

  toast.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  // y = 0 + 5 - 1 = 4
  assertEquals(canvas.get(9, 4)?.char, "O");
});

// Table per-cell styling

Deno.test("Table selectedRow highlights entire row", () => {
  const canvas = new Canvas(40, 5);
  const table = Table({
    rows: [["A", "1"], ["B", "2"]],
    selectedRow: 1,
    selectedStyle: { fg: colors.fg.cyan },
    border: false,
    columnWidths: [5, 5],
  });

  table.render(canvas, { x: 0, y: 0, width: 40, height: 5 });

  // Row 1 should have selectedStyle
  assertEquals(canvas.get(0, 1)?.fg, colors.fg.cyan);
});

// List with Component items

Deno.test("List renders Component items", () => {
  const canvas = new Canvas(20, 5);
  const list = List({
    items: [
      Box({ border: "single", child: Text("A") }),
      Text("B"),
    ],
    itemHeight: 3,
  });

  list.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // First item is a Box with border
  assertEquals(canvas.get(0, 0)?.char, "┌");
  // Second item is Text at y=3
  assertEquals(canvas.get(0, 3)?.char, "B");
});

Deno.test("List renderItem callback", () => {
  const canvas = new Canvas(20, 5);
  const list = List({
    items: ["A", "B", "C"],
    selected: 1,
    renderItem: (item, _index, selected) => {
      const prefix = selected ? ">> " : "   ";
      return Text(prefix + item);
    },
  });

  list.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  // Custom render: ">> B" at row 1
  assertEquals(canvas.get(0, 1)?.char, ">");
  assertEquals(canvas.get(1, 1)?.char, ">");
  assertEquals(canvas.get(3, 1)?.char, "B");
});

// Badge padding

Deno.test("Badge respects custom padding", () => {
  const canvas = new Canvas(20, 1);
  const badge = Badge({ text: "OK", padding: 0 });

  badge.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  // No padding: "OK" starts at x=0
  assertEquals(canvas.get(0, 0)?.char, "O");
  assertEquals(canvas.get(1, 0)?.char, "K");
});

Deno.test("Badge respects asymmetric padding", () => {
  const canvas = new Canvas(20, 1);
  const badge = Badge({ text: "OK", padding: { left: 2, right: 0 } });

  badge.render(canvas, { x: 0, y: 0, width: 20, height: 1 });

  // 2 spaces then "OK"
  assertEquals(canvas.get(0, 0)?.char, " ");
  assertEquals(canvas.get(1, 0)?.char, " ");
  assertEquals(canvas.get(2, 0)?.char, "O");
  assertEquals(canvas.get(3, 0)?.char, "K");
});

// ============================================================
// handleKey tests
// ============================================================

// TextInput.handleKey

Deno.test("TextInput.handleKey inserts character", () => {
  const input = TextInput({ value: "ab", cursorPos: 1 });
  const result = input.handleKey(key("x"));
  assertEquals(result, { value: "axb", cursorPos: 2 });
});

Deno.test("TextInput.handleKey handles Backspace", () => {
  const input = TextInput({ value: "abc", cursorPos: 2 });
  const result = input.handleKey(key("Backspace"));
  assertEquals(result, { value: "ac", cursorPos: 1 });
});

Deno.test("TextInput.handleKey Backspace at start does nothing", () => {
  const input = TextInput({ value: "abc", cursorPos: 0 });
  const result = input.handleKey(key("Backspace"));
  assertEquals(result, undefined);
});

Deno.test("TextInput.handleKey handles Delete", () => {
  const input = TextInput({ value: "abc", cursorPos: 1 });
  const result = input.handleKey(key("Delete"));
  assertEquals(result, { value: "ac", cursorPos: 1 });
});

Deno.test("TextInput.handleKey Delete at end does nothing", () => {
  const input = TextInput({ value: "abc", cursorPos: 3 });
  const result = input.handleKey(key("Delete"));
  assertEquals(result, undefined);
});

Deno.test("TextInput.handleKey moves cursor left", () => {
  const input = TextInput({ value: "abc", cursorPos: 2 });
  const result = input.handleKey(key("Left"));
  assertEquals(result, { value: "abc", cursorPos: 1 });
});

Deno.test("TextInput.handleKey moves cursor right", () => {
  const input = TextInput({ value: "abc", cursorPos: 1 });
  const result = input.handleKey(key("Right"));
  assertEquals(result, { value: "abc", cursorPos: 2 });
});

Deno.test("TextInput.handleKey Home moves to start", () => {
  const input = TextInput({ value: "abc", cursorPos: 2 });
  const result = input.handleKey(key("Home"));
  assertEquals(result, { value: "abc", cursorPos: 0 });
});

Deno.test("TextInput.handleKey End moves to end", () => {
  const input = TextInput({ value: "abc", cursorPos: 0 });
  const result = input.handleKey(key("End"));
  assertEquals(result, { value: "abc", cursorPos: 3 });
});

Deno.test("TextInput.handleKey Ctrl+A moves to start", () => {
  const input = TextInput({ value: "abc", cursorPos: 2 });
  const result = input.handleKey(key("a", { ctrl: true }));
  assertEquals(result, { value: "abc", cursorPos: 0 });
});

Deno.test("TextInput.handleKey Ctrl+E moves to end", () => {
  const input = TextInput({ value: "abc", cursorPos: 0 });
  const result = input.handleKey(key("e", { ctrl: true }));
  assertEquals(result, { value: "abc", cursorPos: 3 });
});

Deno.test("TextInput.handleKey Ctrl+K kills to end of line", () => {
  const input = TextInput({ value: "abcdef", cursorPos: 3 });
  const result = input.handleKey(key("k", { ctrl: true }));
  assertEquals(result, { value: "abc", cursorPos: 3 });
});

Deno.test("TextInput.handleKey Ctrl+U kills to start of line", () => {
  const input = TextInput({ value: "abcdef", cursorPos: 3 });
  const result = input.handleKey(key("u", { ctrl: true }));
  assertEquals(result, { value: "def", cursorPos: 0 });
});

Deno.test("TextInput.handleKey bubbles Tab", () => {
  const input = TextInput({ value: "abc", cursorPos: 0 });
  assertEquals(input.handleKey(key("Tab")), undefined);
});

Deno.test("TextInput.handleKey bubbles Enter", () => {
  const input = TextInput({ value: "abc", cursorPos: 0 });
  assertEquals(input.handleKey(key("Enter")), undefined);
});

Deno.test("TextInput.handleKey bubbles Escape", () => {
  const input = TextInput({ value: "abc", cursorPos: 0 });
  assertEquals(input.handleKey(key("Escape")), undefined);
});

Deno.test("TextInput.handleKey bubbles Ctrl+C", () => {
  const input = TextInput({ value: "abc", cursorPos: 0 });
  assertEquals(input.handleKey(key("c", { ctrl: true })), undefined);
});

// Checkbox.handleKey

Deno.test("Checkbox.handleKey Space toggles on", () => {
  const cb = Checkbox({ checked: false });
  assertEquals(cb.handleKey(key(" ")), { checked: true });
});

Deno.test("Checkbox.handleKey Space toggles off", () => {
  const cb = Checkbox({ checked: true });
  assertEquals(cb.handleKey(key(" ")), { checked: false });
});

Deno.test("Checkbox.handleKey Enter toggles", () => {
  const cb = Checkbox({ checked: false });
  assertEquals(cb.handleKey(key("Enter")), { checked: true });
});

Deno.test("Checkbox.handleKey bubbles other keys", () => {
  const cb = Checkbox({ checked: false });
  assertEquals(cb.handleKey(key("a")), undefined);
  assertEquals(cb.handleKey(key("Tab")), undefined);
});

// Select.handleKey

Deno.test("Select.handleKey opens on Space when closed", () => {
  const sel = Select({ options: ["A", "B", "C"], selected: 0 });
  assertEquals(sel.handleKey(key(" ")), { selected: 0, open: true });
});

Deno.test("Select.handleKey opens on Enter when closed", () => {
  const sel = Select({ options: ["A", "B", "C"], selected: 1 });
  assertEquals(sel.handleKey(key("Enter")), { selected: 1, open: true });
});

Deno.test("Select.handleKey bubbles other keys when closed", () => {
  const sel = Select({ options: ["A", "B", "C"], selected: 0 });
  assertEquals(sel.handleKey(key("Up")), undefined);
});

Deno.test("Select.handleKey navigates down when open", () => {
  const sel = Select({ options: ["A", "B", "C"], selected: 0, open: true });
  assertEquals(sel.handleKey(key("Down")), { selected: 1, open: true });
});

Deno.test("Select.handleKey navigates up when open", () => {
  const sel = Select({ options: ["A", "B", "C"], selected: 2, open: true });
  assertEquals(sel.handleKey(key("Up")), { selected: 1, open: true });
});

Deno.test("Select.handleKey clamps at boundaries", () => {
  const sel = Select({ options: ["A", "B", "C"], selected: 0, open: true });
  assertEquals(sel.handleKey(key("Up")), { selected: 0, open: true });
  const sel2 = Select({ options: ["A", "B", "C"], selected: 2, open: true });
  assertEquals(sel2.handleKey(key("Down")), { selected: 2, open: true });
});

Deno.test("Select.handleKey confirms with Enter", () => {
  const sel = Select({ options: ["A", "B", "C"], selected: 1, open: true });
  assertEquals(sel.handleKey(key("Enter")), { selected: 1, open: false });
});

Deno.test("Select.handleKey closes with Escape", () => {
  const sel = Select({ options: ["A", "B", "C"], selected: 1, open: true });
  assertEquals(sel.handleKey(key("Escape")), { selected: 1, open: false });
});

// List.handleKey

Deno.test("List.handleKey navigates down", () => {
  const list = List({ items: ["A", "B", "C"], selected: 0 });
  assertEquals(list.handleKey(key("Down")), { selected: 1 });
});

Deno.test("List.handleKey navigates up", () => {
  const list = List({ items: ["A", "B", "C"], selected: 2 });
  assertEquals(list.handleKey(key("Up")), { selected: 1 });
});

Deno.test("List.handleKey Home goes to first", () => {
  const list = List({ items: ["A", "B", "C"], selected: 2 });
  assertEquals(list.handleKey(key("Home")), { selected: 0 });
});

Deno.test("List.handleKey End goes to last", () => {
  const list = List({ items: ["A", "B", "C"], selected: 0 });
  assertEquals(list.handleKey(key("End")), { selected: 2 });
});

Deno.test("List.handleKey clamps at boundaries", () => {
  const list = List({ items: ["A", "B", "C"], selected: 0 });
  assertEquals(list.handleKey(key("Up")), { selected: 0 });
  const list2 = List({ items: ["A", "B", "C"], selected: 2 });
  assertEquals(list2.handleKey(key("Down")), { selected: 2 });
});

Deno.test("List.handleKey bubbles other keys", () => {
  const list = List({ items: ["A", "B"], selected: 0 });
  assertEquals(list.handleKey(key("Enter")), undefined);
  assertEquals(list.handleKey(key("a")), undefined);
});

// Tabs.handleKey

Deno.test("Tabs.handleKey switches right", () => {
  const tabs = Tabs({
    tabs: [
      { id: "a", label: "A", content: Text("A") },
      { id: "b", label: "B", content: Text("B") },
    ],
    activeTab: "a",
  });
  assertEquals(tabs.handleKey(key("Right")), { activeTab: "b" });
});

Deno.test("Tabs.handleKey switches left", () => {
  const tabs = Tabs({
    tabs: [
      { id: "a", label: "A", content: Text("A") },
      { id: "b", label: "B", content: Text("B") },
    ],
    activeTab: "b",
  });
  assertEquals(tabs.handleKey(key("Left")), { activeTab: "a" });
});

Deno.test("Tabs.handleKey clamps at boundaries", () => {
  const tabs = Tabs({
    tabs: [
      { id: "a", label: "A", content: Text("A") },
      { id: "b", label: "B", content: Text("B") },
    ],
    activeTab: "a",
  });
  assertEquals(tabs.handleKey(key("Left")), undefined);
  const tabs2 = Tabs({
    tabs: [
      { id: "a", label: "A", content: Text("A") },
      { id: "b", label: "B", content: Text("B") },
    ],
    activeTab: "b",
  });
  assertEquals(tabs2.handleKey(key("Right")), undefined);
});

Deno.test("Tabs.handleKey bubbles other keys", () => {
  const tabs = Tabs({
    tabs: [{ id: "a", label: "A", content: Text("A") }],
    activeTab: "a",
  });
  assertEquals(tabs.handleKey(key("Enter")), undefined);
});

// Tree.handleKey

Deno.test("Tree.handleKey navigates down", () => {
  const tree = Tree({
    nodes: [{ label: "A" }, { label: "B" }, { label: "C" }],
    selected: "A",
  });
  assertEquals(tree.handleKey(key("Down")), { selected: "B" });
});

Deno.test("Tree.handleKey navigates up", () => {
  const tree = Tree({
    nodes: [{ label: "A" }, { label: "B" }, { label: "C" }],
    selected: "B",
  });
  assertEquals(tree.handleKey(key("Up")), { selected: "A" });
});

Deno.test("Tree.handleKey expands with Right", () => {
  const tree = Tree({
    nodes: [{
      label: "Parent",
      expanded: false,
      children: [{ label: "Child" }],
    }],
    selected: "Parent",
  });
  const result = tree.handleKey(key("Right"));
  assertEquals(result, { selected: "Parent", toggled: "Parent" });
});

Deno.test("Tree.handleKey collapses with Left", () => {
  const tree = Tree({
    nodes: [{
      label: "Parent",
      expanded: true,
      children: [{ label: "Child" }],
    }],
    selected: "Parent",
  });
  const result = tree.handleKey(key("Left"));
  assertEquals(result, { selected: "Parent", toggled: "Parent" });
});

Deno.test("Tree.handleKey Left on child goes to parent", () => {
  const tree = Tree({
    nodes: [{
      label: "Parent",
      expanded: true,
      children: [{ label: "Child" }],
    }],
    selected: "Child",
  });
  const result = tree.handleKey(key("Left"));
  assertEquals(result, { selected: "Parent" });
});

Deno.test("Tree.handleKey navigates into expanded children", () => {
  const tree = Tree({
    nodes: [{
      label: "Parent",
      expanded: true,
      children: [{ label: "Child" }],
    }],
    selected: "Parent",
  });
  assertEquals(tree.handleKey(key("Down")), { selected: "Child" });
});

Deno.test("Tree.handleKey bubbles other keys", () => {
  const tree = Tree({
    nodes: [{ label: "A" }],
    selected: "A",
  });
  assertEquals(tree.handleKey(key("Tab")), undefined);
});

// ============================================================
// handleFocusGroup tests
// ============================================================

Deno.test("handleFocusGroup Tab cycles focus forward", () => {
  const input1 = TextInput({ value: "", cursorPos: 0 });
  const input2 = TextInput({ value: "", cursorPos: 0 });
  const result = handleFocusGroup(
    {
      items: [
        { id: "a", input: input1, apply: () => {} },
        { id: "b", input: input2, apply: () => {} },
      ],
      focusedId: "a",
    },
    key("Tab"),
  );
  assertEquals(result.focusedId, "b");
  assertEquals(result.handled, true);
});

Deno.test("handleFocusGroup Shift+Tab cycles focus backward", () => {
  const input1 = TextInput({ value: "", cursorPos: 0 });
  const input2 = TextInput({ value: "", cursorPos: 0 });
  const result = handleFocusGroup(
    {
      items: [
        { id: "a", input: input1, apply: () => {} },
        { id: "b", input: input2, apply: () => {} },
      ],
      focusedId: "b",
    },
    key("Tab", { shift: true }),
  );
  assertEquals(result.focusedId, "a");
  assertEquals(result.handled, true);
});

Deno.test("handleFocusGroup Tab wraps around with cycle", () => {
  const input1 = TextInput({ value: "", cursorPos: 0 });
  const input2 = TextInput({ value: "", cursorPos: 0 });
  const result = handleFocusGroup(
    {
      items: [
        { id: "a", input: input1, apply: () => {} },
        { id: "b", input: input2, apply: () => {} },
      ],
      focusedId: "b",
      cycle: true,
    },
    key("Tab"),
  );
  assertEquals(result.focusedId, "a");
});

Deno.test("handleFocusGroup Tab stays at end with cycle=false", () => {
  const input1 = TextInput({ value: "", cursorPos: 0 });
  const input2 = TextInput({ value: "", cursorPos: 0 });
  const result = handleFocusGroup(
    {
      items: [
        { id: "a", input: input1, apply: () => {} },
        { id: "b", input: input2, apply: () => {} },
      ],
      focusedId: "b",
      cycle: false,
    },
    key("Tab"),
  );
  assertEquals(result.focusedId, "b");
});

Deno.test("handleFocusGroup routes key to focused item", () => {
  let value = "hello";
  let cursorPos = 5;
  const input = TextInput({ value, cursorPos });
  const result = handleFocusGroup(
    {
      items: [
        {
          id: "field",
          input: input,
          apply: (u) => {
            const update = u as { value: string; cursorPos: number };
            value = update.value;
            cursorPos = update.cursorPos;
          },
        },
      ],
      focusedId: "field",
    },
    key("a"),
  );
  assertEquals(result.handled, true);
  assertEquals(value, "helloa");
  assertEquals(cursorPos, 6);
});

Deno.test("handleFocusGroup bubbles unhandled events", () => {
  const input = TextInput({ value: "", cursorPos: 0 });
  const result = handleFocusGroup(
    {
      items: [
        { id: "a", input: input, apply: () => {} },
      ],
      focusedId: "a",
    },
    key("Escape"),
  );
  assertEquals(result.handled, false);
});

Deno.test("handleFocusGroup trap mode swallows unhandled events", () => {
  const input = TextInput({ value: "", cursorPos: 0 });
  const result = handleFocusGroup(
    {
      items: [
        { id: "a", input: input, apply: () => {} },
      ],
      focusedId: "a",
      trap: true,
    },
    key("Escape"),
  );
  assertEquals(result.handled, true);
});

Deno.test("handleFocusGroup custom navigation keys", () => {
  const input1 = TextInput({ value: "", cursorPos: 0 });
  const input2 = TextInput({ value: "", cursorPos: 0 });
  const result = handleFocusGroup(
    {
      items: [
        { id: "a", input: input1, apply: () => {} },
        { id: "b", input: input2, apply: () => {} },
      ],
      focusedId: "a",
      navigationKeys: {
        next: (e) => e.key === "Down",
        prev: (e) => e.key === "Up",
      },
    },
    key("Down"),
  );
  assertEquals(result.focusedId, "b");
  assertEquals(result.handled, true);
});

// ============================================================
// Additional List navigation tests (PageUp, PageDown, custom keys)
// ============================================================

Deno.test("List.handleKey PageUp navigates up by pageSize", () => {
  const list = List({
    items: Array.from({ length: 20 }, (_, i) => `${i}`),
    selected: 15,
  });
  const result = list.handleKey(key("PageUp"));
  // Default pageSize is 10
  assertEquals(result, { selected: 5 });
});

Deno.test("List.handleKey PageDown navigates down by pageSize", () => {
  const list = List({
    items: Array.from({ length: 20 }, (_, i) => `${i}`),
    selected: 5,
  });
  const result = list.handleKey(key("PageDown"));
  assertEquals(result, { selected: 15 });
});

Deno.test("List.handleKey PageUp clamps at 0", () => {
  const list = List({
    items: Array.from({ length: 20 }, (_, i) => `${i}`),
    selected: 3,
  });
  const result = list.handleKey(key("PageUp"));
  assertEquals(result, { selected: 0 });
});

Deno.test("List.handleKey PageDown clamps at end", () => {
  const list = List({
    items: Array.from({ length: 20 }, (_, i) => `${i}`),
    selected: 18,
  });
  const result = list.handleKey(key("PageDown"));
  assertEquals(result, { selected: 19 });
});

Deno.test("List.handleKey with custom keys prop (j/k for down/up)", () => {
  const list = List({
    items: ["A", "B", "C"],
    selected: 0,
    keys: { down: ["j"], up: ["k"] },
  });
  const down = list.handleKey(key("j"));
  assertEquals(down, { selected: 1 });

  const list2 = List({
    items: ["A", "B", "C"],
    selected: 2,
    keys: { down: ["j"], up: ["k"] },
  });
  const up = list2.handleKey(key("k"));
  assertEquals(up, { selected: 1 });
});

Deno.test("List.handleKey with custom keys and Ctrl modifier", () => {
  const list = List({
    items: Array.from({ length: 20 }, (_, i) => `${i}`),
    selected: 5,
    keys: { pageDown: ["Ctrl+d"], pageUp: ["Ctrl+u"] },
  });
  const result = list.handleKey(key("d", { ctrl: true }));
  assertEquals(result, { selected: 15 });
});

Deno.test("List with custom pageSize", () => {
  const list = List({
    items: Array.from({ length: 20 }, (_, i) => `${i}`),
    selected: 10,
    pageSize: 5,
  });
  const up = list.handleKey(key("PageUp"));
  assertEquals(up, { selected: 5 });
  const list2 = List({
    items: Array.from({ length: 20 }, (_, i) => `${i}`),
    selected: 10,
    pageSize: 5,
  });
  const down = list2.handleKey(key("PageDown"));
  assertEquals(down, { selected: 15 });
});

// ============================================================
// VirtualList.handleKey tests
// ============================================================

Deno.test("VirtualList.handleKey navigates down", () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i}`);
  const vlist = VirtualList({
    items,
    selected: 0,
    scrollY: 0,
    renderItem: (item: string) => Text(item),
  });
  // Render first to set lastViewportHeight
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  const result = vlist.handleKey(key("Down"));
  assertEquals(result?.selected, 1);
  assertEquals(typeof result?.scrollY, "number");
});

Deno.test("VirtualList.handleKey navigates up", () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i}`);
  const vlist = VirtualList({
    items,
    selected: 5,
    scrollY: 0,
    renderItem: (item: string) => Text(item),
  });
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  const result = vlist.handleKey(key("Up"));
  assertEquals(result?.selected, 4);
});

Deno.test("VirtualList.handleKey Home goes to first item", () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i}`);
  const vlist = VirtualList({
    items,
    selected: 7,
    scrollY: 3,
    renderItem: (item: string) => Text(item),
  });
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  const result = vlist.handleKey(key("Home"));
  assertEquals(result?.selected, 0);
  assertEquals(result?.scrollY, 0);
});

Deno.test("VirtualList.handleKey End goes to last item", () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i}`);
  const vlist = VirtualList({
    items,
    selected: 0,
    scrollY: 0,
    renderItem: (item: string) => Text(item),
  });
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  const result = vlist.handleKey(key("End"));
  assertEquals(result?.selected, 9);
});

Deno.test("VirtualList.handleKey PageUp", () => {
  const items = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
  const vlist = VirtualList({
    items,
    selected: 15,
    scrollY: 10,
    renderItem: (item: string) => Text(item),
  });
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  const result = vlist.handleKey(key("PageUp"));
  assertEquals(result!.selected < 15, true);
});

Deno.test("VirtualList.handleKey PageDown", () => {
  const items = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
  const vlist = VirtualList({
    items,
    selected: 5,
    scrollY: 0,
    renderItem: (item: string) => Text(item),
  });
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  const result = vlist.handleKey(key("PageDown"));
  assertEquals(result!.selected > 5, true);
});

Deno.test("VirtualList.handleKey with custom keys", () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i}`);
  const vlist = VirtualList({
    items,
    selected: 0,
    scrollY: 0,
    keys: { down: ["j"], up: ["k"] },
    renderItem: (item: string) => Text(item),
  });
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  const result = vlist.handleKey(key("j"));
  assertEquals(result?.selected, 1);
});

Deno.test("VirtualList keeps selected in view when scrolling down", () => {
  const items = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
  // selected=4, scrollY=0, viewport height ~5 (7 - 2 borders)
  const vlist = VirtualList({
    items,
    selected: 4,
    scrollY: 0,
    renderItem: (item: string) => Text(item),
  });
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  // Move down past viewport
  const result = vlist.handleKey(key("Down"));
  // scrollY should adjust to keep selected=5 visible
  assertEquals(result?.selected, 5);
  assertEquals(result!.scrollY >= 1, true);
});

Deno.test("VirtualList keeps selected in view when scrolling up", () => {
  const items = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
  const vlist = VirtualList({
    items,
    selected: 5,
    scrollY: 5,
    renderItem: (item: string) => Text(item),
  });
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  const result = vlist.handleKey(key("Up"));
  assertEquals(result?.selected, 4);
  // scrollY should adjust to keep selected=4 visible
  assertEquals(result!.scrollY <= 4, true);
});

Deno.test("VirtualList.handleKey bubbles unhandled keys", () => {
  const items = ["A", "B", "C"];
  const vlist = VirtualList({
    items,
    selected: 0,
    scrollY: 0,
    renderItem: (item: string) => Text(item),
  });
  const canvas = new Canvas(20, 7);
  vlist.render(canvas, { x: 0, y: 0, width: 20, height: 7 });

  const result = vlist.handleKey(key("Enter"));
  assertEquals(result, undefined);
});

// ============================================================
// Additional component tests
// ============================================================

Deno.test("Text with wrap:true and newlines", () => {
  const canvas = new Canvas(20, 5);
  const text = Text({ content: "Line1\nLine2\nLine3", wrap: true });
  text.render(canvas, { x: 0, y: 0, width: 20, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "L");
  assertEquals(canvas.get(4, 0)?.char, "1");
  assertEquals(canvas.get(0, 1)?.char, "L");
  assertEquals(canvas.get(4, 1)?.char, "2");
  assertEquals(canvas.get(0, 2)?.char, "L");
  assertEquals(canvas.get(4, 2)?.char, "3");
});

Deno.test("Box with border:none has no border chars", () => {
  const canvas = new Canvas(10, 5);
  const box = Box({ border: "none", child: Text("Hi") });
  box.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  // No border corners
  assertEquals(canvas.get(0, 0)?.char, "H");
  assertEquals(canvas.get(1, 0)?.char, "i");
});

Deno.test("Box with border:double uses correct double chars", () => {
  const canvas = new Canvas(10, 5);
  const box = Box({ border: "double" });
  box.render(canvas, { x: 0, y: 0, width: 10, height: 5 });

  assertEquals(canvas.get(0, 0)?.char, "╔");
  assertEquals(canvas.get(9, 0)?.char, "╗");
  assertEquals(canvas.get(0, 4)?.char, "╚");
  assertEquals(canvas.get(9, 4)?.char, "╝");
  assertEquals(canvas.get(1, 0)?.char, "═");
  assertEquals(canvas.get(0, 1)?.char, "║");
});

Deno.test("Progress with showPercent:true renders percentage", () => {
  const canvas = new Canvas(30, 1);
  const progress = Progress({ value: 75, width: 10, showPercent: true });
  progress.render(canvas, { x: 0, y: 0, width: 30, height: 1 });

  // Percent text after the bar: " 75%" at position width+1
  assertEquals(canvas.get(12, 0)?.char, "7");
  assertEquals(canvas.get(13, 0)?.char, "5");
  assertEquals(canvas.get(14, 0)?.char, "%");
});

Deno.test("Spinner without label renders only frame char", () => {
  const canvas = new Canvas(10, 1);
  const spinner = Spinner({ frame: 0 });
  spinner.render(canvas, { x: 0, y: 0, width: 10, height: 1 });

  assertEquals(canvas.get(0, 0)?.char, "⠋");
  // No label text after spinner
  assertEquals(canvas.get(2, 0)?.char, " ");
});

Deno.test("Select maxVisible limits dropdown options shown", () => {
  const canvas = new Canvas(20, 10);
  const select = Select({
    options: ["A", "B", "C", "D", "E"],
    selected: 0,
    open: true,
    maxVisible: 2,
  });
  select.render(canvas, { x: 0, y: 0, width: 20, height: 10 });

  // First 2 options visible
  assertEquals(canvas.get(2, 1)?.char, "A");
  assertEquals(canvas.get(2, 2)?.char, "B");
  // Third option should NOT be rendered
  assertEquals(canvas.get(2, 3)?.char, " ");
});

Deno.test("Toast custom width", () => {
  const canvas = new Canvas(30, 3);
  const toast = Toast({ message: "Hi", width: 20 });
  toast.render(canvas, { x: 0, y: 0, width: 30, height: 3 });

  // Toast centered: x = (30-20)/2 = 5
  // The toast fills 20 cells starting at x=5
  // "Hi" centered within 20: textX = 5 + (20-2)/2 = 14
  assertEquals(canvas.get(14, 0)?.char, "H");
  assertEquals(canvas.get(15, 0)?.char, "i");
});

Deno.test("Table without headers renders rows directly", () => {
  const canvas = new Canvas(40, 5);
  const table = Table({
    rows: [["Alice", "30"], ["Bob", "25"]],
    border: false,
  });
  table.render(canvas, { x: 0, y: 0, width: 40, height: 5 });

  // First row starts at y=0 (no headers)
  assertEquals(canvas.get(0, 0)?.char, "A");
  assertEquals(canvas.get(0, 1)?.char, "B");
});
