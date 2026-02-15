// Comprehensive benchmarks for weew
// Run with: deno bench --allow-all src/bench.ts

import { Canvas } from "./canvas.ts";
import {
  Badge,
  Box,
  Checkbox,
  List,
  Progress,
  ScrollBox,
  Select,
  Table,
  Tabs,
  Text,
  TextInput,
  Tree,
  VirtualList,
  VirtualScrollBox,
} from "./components.ts";
import { Column, Flex, Row } from "./layout.ts";
import { charWidth, stripAnsi, visibleLength } from "./ansi.ts";
import type { Rect, VisibleRange } from "./components.ts";
import { isKey, parseKeyEvent } from "./input.ts";
import { handleFocusGroup } from "./focus.ts";

// ============================================================
// Canvas core operations
// ============================================================

Deno.bench("Canvas.set — single cell", () => {
  const canvas = new Canvas(200, 50);
  canvas.set(100, 25, { char: "X", fg: "\x1b[31m", bg: "\x1b[42m" });
});

Deno.bench("Canvas.clear — 200x50", () => {
  const canvas = new Canvas(200, 50);
  canvas.clear();
});

Deno.bench("Canvas.clear — 400x100 (large terminal)", () => {
  const canvas = new Canvas(400, 100);
  canvas.clear();
});

Deno.bench("Canvas.fill — full screen 200x50", () => {
  const canvas = new Canvas(200, 50);
  canvas.fill(0, 0, 200, 50, "#", { fg: "\x1b[31m" });
});

Deno.bench("Canvas.text — short ASCII string", () => {
  const canvas = new Canvas(200, 50);
  canvas.text(0, 0, "Hello, World!");
});

Deno.bench("Canvas.text — 200 char ASCII line", () => {
  const canvas = new Canvas(200, 50);
  const line = "A".repeat(200);
  canvas.text(0, 0, line);
});

Deno.bench("Canvas.text — CJK string (wide chars)", () => {
  const canvas = new Canvas(200, 50);
  canvas.text(0, 0, "你好世界这是一段测试文本用于测试性能");
});

Deno.bench("Canvas.text — mixed ASCII + emoji", () => {
  const canvas = new Canvas(200, 50);
  canvas.text(0, 0, "Hello 🎉 World 🌍 Test 🚀 More 💻 Here 🎨");
});

Deno.bench("Canvas.text — with ANSI codes (slow path)", () => {
  const canvas = new Canvas(200, 50);
  canvas.text(0, 0, "\x1b[31mRed \x1b[32mGreen \x1b[34mBlue\x1b[0m");
});

Deno.bench("Canvas.get — single cell read", () => {
  const canvas = new Canvas(200, 50);
  canvas.set(100, 25, { char: "X" });
  canvas.get(100, 25);
});

Deno.bench("Canvas.toString — 200x50", () => {
  const canvas = new Canvas(200, 50);
  for (let y = 0; y < 50; y++) {
    canvas.text(0, y, "x".repeat(200));
  }
  canvas.toString();
});

Deno.bench("Canvas.toString — 80x24 (standard terminal)", () => {
  const canvas = new Canvas(80, 24);
  for (let y = 0; y < 24; y++) {
    canvas.text(0, y, "x".repeat(80));
  }
  canvas.toString();
});

// ============================================================
// Canvas operations under clipping
// ============================================================

Deno.bench("Canvas.set — with active clip (inside)", () => {
  const canvas = new Canvas(200, 50);
  canvas.pushClip({ x: 10, y: 10, width: 80, height: 30 });
  canvas.set(50, 25, { char: "X" });
  canvas.popClip();
});

Deno.bench("Canvas.set — with active clip (outside, rejected)", () => {
  const canvas = new Canvas(200, 50);
  canvas.pushClip({ x: 10, y: 10, width: 80, height: 30 });
  canvas.set(5, 5, { char: "X" }); // outside clip, should be rejected
  canvas.popClip();
});

Deno.bench("Canvas.text — 200 chars, 50% clipped", () => {
  const canvas = new Canvas(200, 50);
  canvas.pushClip({ x: 100, y: 0, width: 100, height: 50 });
  canvas.text(0, 0, "A".repeat(200));
  canvas.popClip();
});

// ============================================================
// Full frame render cycle
// ============================================================

Deno.bench("Full frame: clear + fill text + toString — 80x24", () => {
  const canvas = new Canvas(80, 24);
  canvas.clear();
  for (let y = 0; y < 24; y++) {
    canvas.text(0, y, `Line ${y}: ${"x".repeat(70)}`);
  }
  canvas.toString();
});

Deno.bench("Full frame: clear + fill text + toString — 200x50", () => {
  const canvas = new Canvas(200, 50);
  canvas.clear();
  for (let y = 0; y < 50; y++) {
    canvas.text(0, y, `Line ${y}: ${"x".repeat(190)}`);
  }
  canvas.toString();
});

// ============================================================
// ANSI utilities
// ============================================================

Deno.bench("charWidth — ASCII 'A'", () => {
  charWidth("A");
});

Deno.bench("charWidth — CJK '你'", () => {
  charWidth("你");
});

Deno.bench("charWidth — emoji '🎉'", () => {
  charWidth("🎉");
});

Deno.bench("stripAnsi — plain string (no ANSI)", () => {
  stripAnsi("Hello World this is a test string");
});

Deno.bench("stripAnsi — string with ANSI codes", () => {
  stripAnsi(
    "\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m text here",
  );
});

Deno.bench("visibleLength — ASCII string", () => {
  visibleLength("Hello World this is a test string");
});

Deno.bench("visibleLength — CJK string", () => {
  visibleLength("你好世界这是一段测试文本");
});

Deno.bench("visibleLength — mixed ANSI + wide chars", () => {
  visibleLength("\x1b[31m你好\x1b[0m World 🎉 test");
});

// ============================================================
// Component rendering
// ============================================================

Deno.bench("Text — short string render", () => {
  const canvas = new Canvas(80, 24);
  const text = Text("Hello, World!");
  text.render(canvas, { x: 0, y: 0, width: 80, height: 24 });
});

Deno.bench("Text — wrapping long paragraph (500 chars)", () => {
  const canvas = new Canvas(80, 50);
  const content = "The quick brown fox jumps over the lazy dog. ".repeat(11);
  const text = Text({ content, wrap: true });
  text.render(canvas, { x: 0, y: 0, width: 80, height: 50 });
});

Deno.bench("Box — with border and child", () => {
  const canvas = new Canvas(80, 24);
  const box = Box({
    border: "single",
    title: "Test Box",
    child: Text("Content here"),
  });
  box.render(canvas, { x: 0, y: 0, width: 80, height: 24 });
});

Deno.bench("List — 50 string items", () => {
  const canvas = new Canvas(80, 50);
  const items = Array.from({ length: 50 }, (_, i) => `Item ${i}`);
  const list = List({ items, selected: 25 });
  list.render(canvas, { x: 0, y: 0, width: 80, height: 50 });
});

Deno.bench("Table — 20 rows x 5 columns", () => {
  const canvas = new Canvas(120, 30);
  const headers = ["Name", "Age", "City", "Email", "Status"];
  const rows = Array.from({ length: 20 }, (_, i) => [
    `User ${i}`,
    `${20 + i}`,
    "New York",
    `user${i}@test.com`,
    i % 2 === 0 ? "Active" : "Inactive",
  ]);
  const table = Table({ headers, rows });
  table.render(canvas, { x: 0, y: 0, width: 120, height: 30 });
});

Deno.bench("Table — 100 rows x 3 columns with per-cell styling", () => {
  const canvas = new Canvas(80, 110);
  const rows = Array.from({ length: 100 }, (_, i) => [
    `Row ${i}`,
    `${i * 10}`,
    i % 3 === 0 ? "Important" : "Normal",
  ]);
  const table = Table({
    rows,
    border: true,
    cellStyleFn: (rowIdx, _colIdx, _value) => {
      if (rowIdx % 2 === 0) return { fg: "\x1b[36m" };
      return undefined;
    },
  });
  table.render(canvas, { x: 0, y: 0, width: 80, height: 110 });
});

// ============================================================
// ScrollBox vs VirtualScrollBox — the critical comparison
// ============================================================

const LARGE_CONTENT_LINES = 10000;

Deno.bench("ScrollBox — 10k lines (O(content), clipped)", () => {
  const canvas = new Canvas(80, 24);
  // Build a child that renders all 10k lines
  const child = {
    render(c: Canvas, rect: Rect) {
      for (let i = 0; i < LARGE_CONTENT_LINES; i++) {
        c.text(rect.x, rect.y + i, `Line ${i}: content here`);
      }
    },
  };
  const scrollBox = ScrollBox({
    scrollY: 5000,
    contentHeight: LARGE_CONTENT_LINES,
    child,
    showScrollbar: false,
  });
  scrollBox.render(canvas, { x: 0, y: 0, width: 80, height: 24 });
});

Deno.bench(
  "VirtualScrollBox — 10k lines (O(viewport), only visible)",
  () => {
    const canvas = new Canvas(80, 24);
    const vsb = VirtualScrollBox({
      scrollY: 5000,
      contentHeight: LARGE_CONTENT_LINES,
      showScrollbar: false,
      border: "none",
      renderSlice(c: Canvas, rect: Rect, range: VisibleRange) {
        for (let i = range.start; i < range.end; i++) {
          c.text(rect.x, rect.y + (i - range.start), `Line ${i}: content`);
        }
      },
    });
    vsb.render(canvas, { x: 0, y: 0, width: 80, height: 24 });
  },
);

Deno.bench("VirtualList — 10k items, renderItem", () => {
  const canvas = new Canvas(80, 24);
  const items = Array.from({ length: LARGE_CONTENT_LINES }, (_, i) => i);
  const vlist = VirtualList({
    items,
    scrollY: 5000,
    selected: 5010,
    showScrollbar: false,
    border: "none",
    renderItem: (item: number, _index: number, selected: boolean) => {
      const prefix = selected ? ">> " : "   ";
      return Text(`${prefix}Item #${item}`);
    },
  });
  vlist.render(canvas, { x: 0, y: 0, width: 80, height: 24 });
});

// ============================================================
// Layout composition
// ============================================================

Deno.bench("Row — 5 flex children", () => {
  const canvas = new Canvas(100, 24);
  const row = Row(
    Array.from({ length: 5 }, (_, i) => ({
      component: Text(`Panel ${i}`),
    })),
  );
  row.render(canvas, { x: 0, y: 0, width: 100, height: 24 });
});

Deno.bench("Complex layout — nested Row/Column/Box", () => {
  const canvas = new Canvas(120, 40);
  const layout = Row([
    {
      component: Box({
        border: "single",
        title: "Sidebar",
        child: Column([
          { component: Text("Menu 1"), height: 1 },
          { component: Text("Menu 2"), height: 1 },
          { component: Text("Menu 3"), height: 1 },
        ]),
      }),
      width: 30,
    },
    {
      component: Column([
        {
          component: Box({
            border: "single",
            title: "Header",
            child: Text("Dashboard"),
          }),
          height: 3,
        },
        {
          component: Flex({
            direction: "row",
            gap: 1,
            children: [
              {
                component: Box({
                  border: "rounded",
                  child: Text("Card 1"),
                }),
              },
              {
                component: Box({
                  border: "rounded",
                  child: Text("Card 2"),
                }),
              },
              {
                component: Box({
                  border: "rounded",
                  child: Text("Card 3"),
                }),
              },
            ],
          }),
        },
      ]),
    },
  ]);
  layout.render(canvas, { x: 0, y: 0, width: 120, height: 40 });
});

// ============================================================
// Stress tests — extreme cases
// ============================================================

Deno.bench("Stress: 1000 Text renders on same canvas", () => {
  const canvas = new Canvas(200, 50);
  for (let i = 0; i < 1000; i++) {
    const y = i % 50;
    const x = (i * 7) % 150;
    canvas.text(x, y, `text-${i}`);
  }
});

Deno.bench("Stress: 500 Box renders (border drawing)", () => {
  const canvas = new Canvas(200, 200);
  for (let i = 0; i < 500; i++) {
    const box = Box({ border: "single" });
    box.render(canvas, {
      x: (i * 3) % 180,
      y: (i * 2) % 180,
      width: 20,
      height: 10,
    });
  }
});

Deno.bench("Stress: Canvas resize + clear cycle x100", () => {
  const canvas = new Canvas(80, 24);
  for (let i = 0; i < 100; i++) {
    canvas.resize(80 + (i % 40), 24 + (i % 20));
    canvas.clear();
  }
});

Deno.bench("Stress: 10k canvas.set calls", () => {
  const canvas = new Canvas(200, 50);
  for (let i = 0; i < 10000; i++) {
    canvas.set(i % 200, Math.floor(i / 200) % 50, {
      char: "X",
      fg: "\x1b[31m",
    });
  }
});

Deno.bench("Stress: 10k canvas.set calls with clip (all rejected)", () => {
  const canvas = new Canvas(200, 50);
  canvas.pushClip({ x: 0, y: 0, width: 1, height: 1 }); // tiny clip
  for (let i = 0; i < 10000; i++) {
    canvas.set(10 + (i % 190), 1 + Math.floor(i / 200) % 49, { char: "X" });
  }
  canvas.popClip();
});

Deno.bench("Stress: visibleLength on 1000 strings", () => {
  const strings = Array.from(
    { length: 1000 },
    (_, i) => `Item ${i}: some text with 你好 and 🎉`,
  );
  for (const s of strings) {
    visibleLength(s);
  }
});

// ============================================================
// Canvas output path
// ============================================================

Deno.bench("Canvas.toAnsi — 80x24 with styles", () => {
  const canvas = new Canvas(80, 24);
  for (let y = 0; y < 24; y++) {
    canvas.text(0, y, "styled text here!", {
      fg: "\x1b[31m",
      bg: "\x1b[42m",
      style: "\x1b[1m",
    });
  }
  canvas.toAnsi();
});

Deno.bench("Canvas.toAnsi — 200x50 with styles", () => {
  const canvas = new Canvas(200, 50);
  for (let y = 0; y < 50; y++) {
    canvas.text(0, y, "styled text here!".repeat(5), {
      fg: "\x1b[31m",
      bg: "\x1b[42m",
      style: "\x1b[1m",
    });
  }
  canvas.toAnsi();
});

// ============================================================
// Input parsing
// ============================================================

Deno.bench("parseKeyEvent — single ASCII byte", () => {
  parseKeyEvent(new Uint8Array([0x61])); // 'a'
});

Deno.bench("parseKeyEvent — arrow key (3-byte CSI)", () => {
  parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x41])); // Up
});

Deno.bench("parseKeyEvent — modified key (CSI with modifier)", () => {
  parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x31, 0x3b, 0x35, 0x43])); // Ctrl+Right "1;5C"
});

Deno.bench("parseKeyEvent — UTF-8 multibyte (CJK char)", () => {
  parseKeyEvent(new Uint8Array([0xe4, 0xbd, 0xa0])); // 你
});

Deno.bench("isKey — simple match", () => {
  const event = {
    key: "q",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    raw: new Uint8Array(),
  };
  isKey(event, "q");
});

Deno.bench("isKey — with modifiers", () => {
  const event = {
    key: "s",
    ctrl: true,
    alt: false,
    shift: true,
    meta: false,
    raw: new Uint8Array(),
  };
  isKey(event, "s", { ctrl: true, shift: true });
});

// ============================================================
// Focus routing
// ============================================================

Deno.bench("handleFocusGroup — Tab navigation (5 items)", () => {
  const items = Array.from({ length: 5 }, (_, i) => ({
    id: `item-${i}`,
    input: TextInput({ value: "", cursorPos: 0 }),
    apply: (s: number) => s,
  }));
  const event = {
    key: "Tab",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    raw: new Uint8Array(),
  };
  handleFocusGroup({ items, focusedId: "item-2" }, event, 0);
});

Deno.bench("handleFocusGroup — key routing to focused TextInput", () => {
  const items = [{
    id: "field",
    input: TextInput({ value: "hello world", cursorPos: 5 }),
    apply: (_s: string, u: unknown) => (u as { value: string }).value,
  }];
  const event = {
    key: "a",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    raw: new Uint8Array(),
  };
  handleFocusGroup({ items, focusedId: "field" }, event, "hello world");
});

// ============================================================
// More components
// ============================================================

Deno.bench("TextInput — render with cursor and 50-char value", () => {
  const canvas = new Canvas(80, 1);
  const input = TextInput({
    value: "a".repeat(50),
    cursorPos: 25,
    focused: true,
  });
  input.render(canvas, { x: 0, y: 0, width: 80, height: 1 });
});

Deno.bench("Checkbox — render checked", () => {
  const canvas = new Canvas(30, 1);
  const cb = Checkbox({ checked: true, label: "Accept terms and conditions" });
  cb.render(canvas, { x: 0, y: 0, width: 30, height: 1 });
});

Deno.bench("Select — render open with 50 options", () => {
  const canvas = new Canvas(40, 60);
  const options = Array.from({ length: 50 }, (_, i) => `Option ${i}`);
  const sel = Select({ options, selected: 25, open: true });
  sel.render(canvas, { x: 0, y: 0, width: 40, height: 60 });
});

Deno.bench("Tree — 3 levels, 50 nodes expanded", () => {
  const canvas = new Canvas(80, 60);
  const children = Array.from({ length: 10 }, (_, i) => ({
    label: `Child ${i}`,
    expanded: true,
    children: Array.from(
      { length: 4 },
      (_, j) => ({ label: `Leaf ${i}-${j}` }),
    ),
  }));
  const nodes = [{ label: "Root", expanded: true, children }];
  const tree = Tree({ nodes, selected: "Child 5" });
  tree.render(canvas, { x: 0, y: 0, width: 80, height: 60 });
});

Deno.bench("Tabs — render 5 tabs with active content", () => {
  const canvas = new Canvas(80, 24);
  const tabs = Tabs({
    tabs: Array.from({ length: 5 }, (_, i) => ({
      id: `tab-${i}`,
      label: `Tab ${i}`,
      content: Text(`Content for tab ${i}`),
    })),
    activeTab: "tab-2",
  });
  tabs.render(canvas, { x: 0, y: 0, width: 80, height: 24 });
});

// ============================================================
// Real-world scenario
// ============================================================

Deno.bench("Dashboard: sidebar + header + table + status bar", () => {
  const canvas = new Canvas(120, 40);
  const layout = Row([
    {
      component: Box({
        border: "single",
        title: "Navigation",
        child: List({
          items: ["Dashboard", "Users", "Settings", "Reports", "Analytics"],
          selected: 0,
        }),
      }),
      width: 25,
    },
    {
      component: Column([
        {
          component: Box({
            border: "single",
            title: "System Status",
            child: Row([
              { component: Text("CPU: "), width: 5 },
              { component: Progress({ value: 73, width: 20 }), width: 20 },
              { component: Text("  RAM: "), width: 7 },
              { component: Progress({ value: 45, width: 20 }), width: 20 },
              { component: Badge({ text: "OK" }), width: 6 },
            ]),
          }),
          height: 5,
        },
        {
          component: Box({
            border: "single",
            title: "Recent Activity",
            child: Table({
              headers: ["Time", "User", "Action", "Status"],
              rows: Array.from({ length: 20 }, (_, i) => [
                `12:${String(i).padStart(2, "0")}`,
                `user_${i}`,
                i % 3 === 0 ? "login" : i % 3 === 1 ? "upload" : "download",
                i % 4 === 0 ? "error" : "success",
              ]),
            }),
          }),
        },
      ]),
    },
  ]);
  layout.render(canvas, { x: 0, y: 0, width: 120, height: 40 });
});
