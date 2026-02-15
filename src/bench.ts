// Comprehensive benchmarks for weew
// Run with: deno bench --allow-all src/bench.ts

import { Canvas } from "./canvas.ts";
import {
  Box,
  List,
  ScrollBox,
  Table,
  Text,
  VirtualList,
  VirtualScrollBox,
} from "./components.ts";
import { Column, Flex, Row } from "./layout.ts";
import { charWidth, stripAnsi, visibleLength } from "./ansi.ts";
import type { Rect, VisibleRange } from "./components.ts";

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
