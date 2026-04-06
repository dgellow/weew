/**
 * Bun ecosystem tests for weew.
 *
 * These verify that all runtime-agnostic modules work correctly under Bun.
 * They mirror the Deno tests in src/*_test.ts for the pure (non-terminal) surface.
 *
 * Run: bun test tests/bun_test.ts
 */

import { describe, expect, test } from "bun:test";
import { Canvas } from "../src/canvas.ts";
import {
  Badge,
  Box,
  buildStyle,
  Checkbox,
  Dialog,
  Divider,
  List,
  Progress,
  ScrollBox,
  Select,
  Spinner,
  Table,
  Tabs,
  Text,
  TextInput,
  Tree,
  VirtualList,
} from "../src/components.ts";
import type { KeyEvent } from "../src/input.ts";
import { isKey, Keys, parseKeyEvent } from "../src/input.ts";
import { handleFocusGroup } from "../src/focus.ts";
import type { FocusItem } from "../src/focus.ts";
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
} from "../src/layout.ts";
import { Screen, TestScreenIO } from "../src/screen.ts";
import type { ScreenEvent } from "../src/screen.ts";
import { nodeTerminalIO } from "../src/node_io.ts";
import { TestDriver } from "../src/test_driver.ts";
import { charWidth, stripAnsi, styled, visibleLength } from "../src/ansi.ts";

// -- Helpers --

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

function textAt(canvas: Canvas, x: number, y: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    const cell = canvas.get(x + i, y);
    if (cell && cell.char !== "") s += cell.char;
  }
  return s;
}

// -- ANSI --

describe("ansi", () => {
  test("stripAnsi removes ANSI codes", () => {
    expect(stripAnsi("\x1b[31mhello\x1b[0m")).toBe("hello");
  });

  test("visibleLength without ANSI", () => {
    expect(visibleLength("hello")).toBe(5);
  });

  test("visibleLength with ANSI", () => {
    expect(visibleLength("\x1b[31mhello\x1b[0m")).toBe(5);
  });

  test("charWidth ASCII", () => {
    expect(charWidth("A")).toBe(1);
    expect(charWidth("z")).toBe(1);
  });

  test("charWidth CJK", () => {
    expect(charWidth("你")).toBe(2);
    expect(charWidth("世")).toBe(2);
  });

  test("charWidth emoji", () => {
    expect(charWidth("🎉")).toBe(2);
  });

  test("styled wraps text", () => {
    const result = styled("hello", "\x1b[1m");
    expect(result).toContain("hello");
    expect(result).toContain("\x1b[1m");
  });
});

// -- Canvas --

describe("Canvas", () => {
  test("constructor creates correct size", () => {
    const c = new Canvas(10, 5);
    expect(c.width).toBe(10);
    expect(c.height).toBe(5);
  });

  test("set and get", () => {
    const c = new Canvas(10, 5);
    c.set(0, 0, { char: "A" });
    expect(c.get(0, 0)?.char).toBe("A");
    c.set(5, 2, { char: "B", fg: "red" });
    expect(c.get(5, 2)?.char).toBe("B");
    expect(c.get(5, 2)?.fg).toBe("red");
  });

  test("out of bounds ignored", () => {
    const c = new Canvas(10, 5);
    c.set(-1, 0, { char: "X" });
    c.set(10, 0, { char: "X" });
    c.set(0, 5, { char: "X" });
    expect(c.get(-1, 0)).toBeUndefined();
    expect(c.get(10, 0)).toBeUndefined();
  });

  test("text writes at position", () => {
    const c = new Canvas(20, 5);
    c.text(2, 1, "Hello");
    expect(textAt(c, 2, 1, 5)).toBe("Hello");
  });

  test("clear resets all cells", () => {
    const c = new Canvas(10, 5);
    c.set(0, 0, { char: "X" });
    c.clear();
    expect(c.get(0, 0)?.char).toBe(" ");
  });

  test("resize changes dimensions", () => {
    const c = new Canvas(10, 5);
    c.resize(20, 10);
    expect(c.width).toBe(20);
    expect(c.height).toBe(10);
  });

  test("fill rectangle", () => {
    const c = new Canvas(10, 5);
    c.fill(0, 0, 3, 2, "#");
    expect(c.get(0, 0)?.char).toBe("#");
    expect(c.get(2, 1)?.char).toBe("#");
    expect(c.get(3, 0)?.char).toBe(" ");
  });

  test("hline draws horizontal line", () => {
    const c = new Canvas(10, 5);
    c.hline(0, 0, 5, "-");
    for (let i = 0; i < 5; i++) expect(c.get(i, 0)?.char).toBe("-");
    expect(c.get(5, 0)?.char).toBe(" ");
  });

  test("vline draws vertical line", () => {
    const c = new Canvas(10, 5);
    c.vline(0, 0, 3, "|");
    for (let i = 0; i < 3; i++) expect(c.get(0, i)?.char).toBe("|");
    expect(c.get(0, 3)?.char).toBe(" ");
  });

  test("text handles CJK characters", () => {
    const c = new Canvas(20, 5);
    c.text(0, 0, "你好");
    expect(c.get(0, 0)?.char).toBe("你");
    expect(c.get(1, 0)?.char).toBe(""); // wide char placeholder
    expect(c.get(2, 0)?.char).toBe("好");
  });

  test("pushClip/popClip enforces bounds", () => {
    const c = new Canvas(20, 10);
    c.pushClip({ x: 5, y: 5, width: 5, height: 5 });
    c.set(0, 0, { char: "X" }); // outside clip
    expect(c.get(0, 0)?.char).toBe(" ");
    c.set(5, 5, { char: "Y" }); // inside clip
    expect(c.get(5, 5)?.char).toBe("Y");
    c.popClip();
  });

  test("render returns ANSI diff string", () => {
    const c = new Canvas(10, 3);
    c.text(0, 0, "Hi");
    const output = c.render();
    expect(typeof output).toBe("string");
    expect(output).toContain("H");
    expect(output).toContain("i");
  });

  test("fullRender returns string", () => {
    const c = new Canvas(10, 3);
    c.text(0, 0, "Test");
    const output = c.fullRender();
    expect(typeof output).toBe("string");
    expect(output).toContain("Test");
  });

  test("toString returns plain text", () => {
    const c = new Canvas(10, 2);
    c.text(0, 0, "Line 1");
    c.text(0, 1, "Line 2");
    const text = c.toString();
    expect(text).toContain("Line 1");
    expect(text).toContain("Line 2");
  });

  test("toAnsi with styled cells", () => {
    const c = new Canvas(10, 1);
    c.set(0, 0, { char: "X", fg: "\x1b[31m" });
    const output = c.toAnsi();
    expect(output).toContain("\x1b[31m");
    expect(output).toContain("X");
  });
});

// -- Input --

describe("input", () => {
  test("parseKeyEvent single ASCII byte", () => {
    const ev = parseKeyEvent(new Uint8Array([0x61]));
    expect(ev.key).toBe("a");
    expect(ev.ctrl).toBe(false);
  });

  test("parseKeyEvent arrow keys", () => {
    expect(parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x41])).key).toBe("Up");
    expect(parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x42])).key).toBe("Down");
    expect(parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x43])).key).toBe("Right");
    expect(parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x44])).key).toBe("Left");
  });

  test("parseKeyEvent Ctrl+letter", () => {
    const ev = parseKeyEvent(new Uint8Array([0x03]));
    expect(ev.key).toBe("c");
    expect(ev.ctrl).toBe(true);
  });

  test("parseKeyEvent Enter", () => {
    expect(parseKeyEvent(new Uint8Array([0x0d])).key).toBe("Enter");
  });

  test("parseKeyEvent Backspace", () => {
    expect(parseKeyEvent(new Uint8Array([0x7f])).key).toBe("Backspace");
  });

  test("parseKeyEvent Tab", () => {
    expect(parseKeyEvent(new Uint8Array([0x09])).key).toBe("Tab");
  });

  test("parseKeyEvent Shift+Tab", () => {
    const ev = parseKeyEvent(new Uint8Array([0x1b, 0x5b, 0x5a]));
    expect(ev.key).toBe("Tab");
    expect(ev.shift).toBe(true);
  });

  test("parseKeyEvent Escape", () => {
    expect(parseKeyEvent(new Uint8Array([0x1b])).key).toBe("Escape");
  });

  test("parseKeyEvent uppercase detects shift", () => {
    const ev = parseKeyEvent(new Uint8Array([0x41])); // 'A'
    expect(ev.key).toBe("A");
    expect(ev.shift).toBe(true);
  });

  test("parseKeyEvent UTF-8 multibyte", () => {
    const bytes = new TextEncoder().encode("你");
    expect(parseKeyEvent(bytes).key).toBe("你");
  });

  test("isKey matches simple keys (case-sensitive)", () => {
    expect(isKey(key("a"), "a")).toBe(true);
    expect(isKey(key("A", { shift: true }), "A")).toBe(true);
    expect(isKey(key("a"), "b")).toBe(false);
  });

  test("isKey with modifiers", () => {
    expect(isKey(key("c", { ctrl: true }), "c", { ctrl: true })).toBe(true);
    expect(isKey(key("c"), "c", { ctrl: true })).toBe(false);
  });

  test("Keys constants", () => {
    expect(Keys.Enter).toBe("Enter");
    expect(Keys.Escape).toBe("Escape");
    expect(Keys.Tab).toBe("Tab");
    expect(Keys.Up).toBe("Up");
  });
});

// -- Components --

describe("components", () => {
  test("Text renders simple string", () => {
    const c = new Canvas(20, 5);
    Text("Hello").render(c, { x: 0, y: 0, width: 20, height: 5 });
    expect(textAt(c, 0, 0, 5)).toBe("Hello");
  });

  test("Box renders border", () => {
    const c = new Canvas(10, 3);
    Box({ border: "single", child: Text("Hi") }).render(c, {
      x: 0,
      y: 0,
      width: 10,
      height: 3,
    });
    expect(c.get(0, 0)?.char).toBe("┌");
    expect(c.get(9, 0)?.char).toBe("┐");
    expect(c.get(0, 2)?.char).toBe("└");
    expect(c.get(9, 2)?.char).toBe("┘");
  });

  test("List renders items", () => {
    const c = new Canvas(20, 5);
    List({ items: ["Alpha", "Beta", "Gamma"] }).render(c, {
      x: 0,
      y: 0,
      width: 20,
      height: 5,
    });
    expect(textAt(c, 0, 0, 7)).toContain("Alpha");
    expect(textAt(c, 0, 1, 6)).toContain("Beta");
  });

  test("Progress renders bar", () => {
    const c = new Canvas(20, 1);
    Progress({ value: 50 }).render(c, { x: 0, y: 0, width: 20, height: 1 });
    const text = c.toString();
    expect(text).toContain("█");
  });

  test("Table renders headers and rows", () => {
    const c = new Canvas(30, 5);
    Table({
      headers: ["Name", "Age"],
      rows: [["Alice", "30"], ["Bob", "25"]],
    }).render(c, { x: 0, y: 0, width: 30, height: 5 });
    const text = c.toString();
    expect(text).toContain("Name");
    expect(text).toContain("Alice");
  });

  test("TextInput.handleKey inserts character", () => {
    const input = TextInput({ value: "abc", cursorPos: 3 });
    const result = input.handleKey(key("d"));
    expect(result).not.toBeNull();
    expect(result!.value).toBe("abcd");
    expect(result!.cursorPos).toBe(4);
  });

  test("TextInput.handleKey Backspace", () => {
    const input = TextInput({ value: "abc", cursorPos: 3 });
    const result = input.handleKey(key("Backspace"));
    expect(result).not.toBeNull();
    expect(result!.value).toBe("ab");
  });

  test("Checkbox.handleKey toggles", () => {
    const cb = Checkbox({ checked: false, label: "Test" });
    const result = cb.handleKey(key(" "));
    expect(result).not.toBeNull();
    expect(result!.checked).toBe(true);
  });

  test("Select.handleKey opens and navigates", () => {
    const sel = Select({
      options: ["A", "B", "C"],
      selected: 0,
      open: false,
    });
    const opened = sel.handleKey(key(" "));
    expect(opened).not.toBeNull();
    expect(opened!.open).toBe(true);

    const selOpen = Select({
      options: ["A", "B", "C"],
      selected: 0,
      open: true,
    });
    const moved = selOpen.handleKey(key("Down"));
    expect(moved).not.toBeNull();
    expect(moved!.selected).toBe(1);
  });

  test("Spinner renders frame", () => {
    const c = new Canvas(20, 1);
    Spinner({ frame: 0 }).render(c, { x: 0, y: 0, width: 20, height: 1 });
    expect(c.get(0, 0)?.char).not.toBe(" ");
  });

  test("Badge renders text", () => {
    const c = new Canvas(20, 1);
    Badge({ text: "OK" }).render(c, { x: 0, y: 0, width: 20, height: 1 });
    const text = c.toString();
    expect(text).toContain("OK");
  });

  test("buildStyle combines properties", () => {
    expect(buildStyle({})).toBe("");
    expect(buildStyle({ bold: true })).toContain("\x1b[1m");
  });

  test("Divider renders line", () => {
    const c = new Canvas(10, 1);
    Divider({}).render(c, { x: 0, y: 0, width: 10, height: 1 });
    expect(c.get(0, 0)?.char).toBe("─");
  });

  test("Dialog renders centered box", () => {
    const c = new Canvas(40, 20);
    Dialog({ width: 20, height: 10, child: Text("Modal") }).render(c, {
      x: 0,
      y: 0,
      width: 40,
      height: 20,
    });
    const text = c.toString();
    expect(text).toContain("Modal");
  });

  test("Tabs renders labels", () => {
    const c = new Canvas(30, 5);
    Tabs({
      tabs: [
        { id: "t1", label: "Tab1", content: Text("Content1") },
        { id: "t2", label: "Tab2", content: Text("Content2") },
      ],
      activeTab: "t1",
    }).render(c, { x: 0, y: 0, width: 30, height: 5 });
    const text = c.toString();
    expect(text).toContain("Tab1");
    expect(text).toContain("Content1");
  });

  test("Tree renders nodes", () => {
    const c = new Canvas(30, 5);
    Tree({
      nodes: [
        {
          label: "Root",
          expanded: true,
          children: [
            { label: "Child" },
          ],
        },
      ],
      selected: "Root",
    }).render(c, { x: 0, y: 0, width: 30, height: 5 });
    const text = c.toString();
    expect(text).toContain("Root");
    expect(text).toContain("Child");
  });

  test("ScrollBox renders content", () => {
    const c = new Canvas(20, 5);
    ScrollBox({
      scrollY: 0,
      contentHeight: 10,
      border: "single",
      child: Text("Scrolled"),
    }).render(c, { x: 0, y: 0, width: 20, height: 5 });
    const text = c.toString();
    expect(text).toContain("Scrolled");
  });

  test("VirtualList renders visible items", () => {
    const c = new Canvas(20, 5);
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
    VirtualList({
      items,
      itemHeight: 1,
      selected: 0,
      scrollY: 0,
      renderItem: (item) => Text(item),
    }).render(c, { x: 0, y: 0, width: 20, height: 5 });
    const text = c.toString();
    expect(text).toContain("Item 0");
  });
});

// -- Focus --

describe("focus", () => {
  test("Tab navigates forward", () => {
    const items: FocusItem[] = [
      {
        id: "a",
        input: Checkbox({ checked: false, label: "A" }),
        apply: () => {},
      },
      {
        id: "b",
        input: Checkbox({ checked: false, label: "B" }),
        apply: () => {},
      },
    ];
    const result = handleFocusGroup({ items, focusedId: "a" }, key("Tab"));
    expect(result.handled).toBe(true);
    expect(result.focusedId).toBe("b");
  });

  test("Shift+Tab navigates backward", () => {
    const items: FocusItem[] = [
      {
        id: "a",
        input: Checkbox({ checked: false, label: "A" }),
        apply: () => {},
      },
      {
        id: "b",
        input: Checkbox({ checked: false, label: "B" }),
        apply: () => {},
      },
    ];
    const result = handleFocusGroup(
      { items, focusedId: "b" },
      key("Tab", { shift: true }),
    );
    expect(result.handled).toBe(true);
    expect(result.focusedId).toBe("a");
  });

  test("routes key to focused item", () => {
    let toggled = false;
    const items: FocusItem[] = [
      {
        id: "cb",
        input: Checkbox({ checked: false, label: "Check" }),
        apply: () => {
          toggled = true;
        },
      },
    ];
    const result = handleFocusGroup({ items, focusedId: "cb" }, key(" "));
    expect(result.handled).toBe(true);
    expect(toggled).toBe(true);
  });

  test("empty items returns handled=false", () => {
    const result = handleFocusGroup({ items: [], focusedId: "x" }, key("Tab"));
    expect(result.handled).toBe(false);
  });
});

// -- Layout --

describe("layout", () => {
  test("Row renders children horizontally", () => {
    const c = new Canvas(20, 1);
    Row([
      { component: Text("AB"), width: 5 },
      { component: Text("CD"), width: 5 },
    ]).render(c, { x: 0, y: 0, width: 20, height: 1 });
    expect(textAt(c, 0, 0, 2)).toBe("AB");
    expect(textAt(c, 5, 0, 2)).toBe("CD");
  });

  test("Column renders children vertically", () => {
    const c = new Canvas(10, 5);
    Column([
      { component: Text("Top"), height: 1 },
      { component: Text("Bot"), height: 1 },
    ]).render(c, { x: 0, y: 0, width: 10, height: 5 });
    expect(textAt(c, 0, 0, 3)).toBe("Top");
    expect(textAt(c, 0, 1, 3)).toBe("Bot");
  });

  test("Flex distributes space", () => {
    const c = new Canvas(20, 1);
    Flex({
      direction: "row",
      children: [
        { component: Text("A"), flex: 1 },
        { component: Text("B"), flex: 1 },
      ],
    }).render(c, { x: 0, y: 0, width: 20, height: 1 });
    expect(textAt(c, 0, 0, 1)).toBe("A");
    expect(textAt(c, 10, 0, 1)).toBe("B");
  });

  test("Grid renders in columns", () => {
    const c = new Canvas(20, 5);
    Grid({
      columns: 2,
      children: [Text("1"), Text("2"), Text("3"), Text("4")],
    }).render(c, { x: 0, y: 0, width: 20, height: 5 });
    expect(textAt(c, 0, 0, 1)).toBe("1");
    expect(textAt(c, 10, 0, 1)).toBe("2");
  });

  test("Padding adds space", () => {
    const c = new Canvas(20, 5);
    Padding({ padding: 2, child: Text("X") }).render(c, {
      x: 0,
      y: 0,
      width: 20,
      height: 5,
    });
    expect(c.get(0, 0)?.char).toBe(" ");
    expect(textAt(c, 2, 2, 1)).toBe("X");
  });

  test("Center centers child", () => {
    const c = new Canvas(20, 5);
    Center({ width: 4, height: 1, child: Text("Hi") }).render(c, {
      x: 0,
      y: 0,
      width: 20,
      height: 5,
    });
    expect(textAt(c, 8, 2, 2)).toBe("Hi");
  });

  test("Spacer creates FlexChild", () => {
    const s = Spacer({ flex: 2 });
    expect(s.flex).toBe(2);
  });

  test("Positioned places child", () => {
    const c = new Canvas(20, 10);
    Positioned({ x: 5, y: 3, child: Text("P") }).render(c, {
      x: 0,
      y: 0,
      width: 20,
      height: 10,
    });
    expect(textAt(c, 5, 3, 1)).toBe("P");
  });

  test("Stack layers children", () => {
    const c = new Canvas(10, 3);
    Stack([Text("AAA"), Text("BB")]).render(c, {
      x: 0,
      y: 0,
      width: 10,
      height: 3,
    });
    // Second child overwrites first at overlap
    expect(textAt(c, 0, 0, 2)).toBe("BB");
    expect(textAt(c, 2, 0, 1)).toBe("A");
  });
});

// -- Screen with TestScreenIO --

describe("Screen", () => {
  test("draw renders to canvas", () => {
    const io = new TestScreenIO(20, 5);
    const screen = new Screen({ io });
    screen.draw(() => Text("Hello Screen"));
    expect(screen.canvas.toString()).toContain("Hello Screen");
    screen.close();
  });

  test("draw passes correct dimensions", () => {
    const io = new TestScreenIO(40, 10);
    const screen = new Screen({ io });
    screen.draw(({ width, height }) => Text(`${width}x${height}`));
    expect(screen.canvas.toString()).toContain("40x10");
    screen.close();
  });

  test("draw clears between frames", () => {
    const io = new TestScreenIO(20, 5);
    const screen = new Screen({ io });
    screen.draw(() => Text("First"));
    expect(screen.canvas.toString()).toContain("First");
    screen.draw(() => Text("Second"));
    expect(screen.canvas.toString()).toContain("Second");
    expect(screen.canvas.toString()).not.toContain("First");
    screen.close();
  });

  test("width and height match IO", () => {
    const io = new TestScreenIO(60, 20);
    const screen = new Screen({ io });
    expect(screen.width).toBe(60);
    expect(screen.height).toBe(20);
    screen.close();
  });

  test("events yields key events", async () => {
    const io = new TestScreenIO(20, 5);
    const screen = new Screen({ io });
    const received: ScreenEvent[] = [];

    io.pushKey("a");
    io.pushKey("b");
    io.close();

    for await (const event of screen.events()) {
      received.push(event);
    }

    expect(received.length).toBe(2);
    expect(received[0].type).toBe("key");
    if (received[0].type === "key") expect(received[0].key).toBe("a");
    if (received[1].type === "key") expect(received[1].key).toBe("b");
    screen.close();
  });

  test("events yields resize events", async () => {
    const io = new TestScreenIO(80, 24);
    const screen = new Screen({ io });

    io.pushResize(40, 12);
    io.close();

    const received: ScreenEvent[] = [];
    for await (const event of screen.events()) {
      received.push(event);
    }

    expect(received.length).toBe(1);
    expect(received[0].type).toBe("resize");
    if (received[0].type === "resize") {
      expect(received[0].columns).toBe(40);
      expect(received[0].rows).toBe(12);
    }
    screen.close();
  });

  test("close is idempotent", () => {
    const io = new TestScreenIO(20, 5);
    const screen = new Screen({ io });
    screen.close();
    screen.close();
  });

  test("Symbol.dispose calls close", () => {
    const io = new TestScreenIO(20, 5);
    {
      using screen = new Screen({ io });
      screen.draw(() => Text("disposed"));
    }
  });
});

// -- Screen with nodeTerminalIO --

describe("nodeTerminalIO", () => {
  test("size returns valid dimensions", () => {
    const io = nodeTerminalIO();
    const size = io.size();
    expect(size.columns).toBeGreaterThan(0);
    expect(size.rows).toBeGreaterThan(0);
    io.close();
  });

  test("flush writes canvas diff to stdout", () => {
    const io = nodeTerminalIO();
    const canvas = new Canvas(20, 5);
    canvas.text(0, 0, "Hello Bun");
    io.flush(canvas);
    io.close();
  });

  test("Screen constructs and draws without error", () => {
    const io = nodeTerminalIO();
    const screen = new Screen({ io });
    expect(screen.width).toBeGreaterThan(0);
    expect(screen.height).toBeGreaterThan(0);
    screen.draw(() => Text("nodeTerminalIO draw"));
    screen.close();
  });

  test("Screen.draw can be called multiple times", () => {
    const io = nodeTerminalIO();
    const screen = new Screen({ io });
    screen.draw(() => Text("Frame 1"));
    screen.draw(() => Text("Frame 2"));
    screen.draw(() => Text("Frame 3"));
    screen.close();
  });

  test("close is idempotent", () => {
    const io = nodeTerminalIO();
    const screen = new Screen({ io });
    screen.close();
    screen.close();
  });
});

// -- TestDriver --

describe("TestDriver", () => {
  test("renders initial state", () => {
    const driver = new TestDriver({ render: () => Text("Count: 0") }, 20, 5);
    expect(textAt(driver.screen, 0, 0, 8)).toBe("Count: 0");
  });

  test("sendKey updates via closure", () => {
    let count = 0;
    const driver = new TestDriver(
      {
        render: () => Text(`Count: ${count}`),
        onKey: (event) => {
          if (event.key === "Up") count++;
          if (event.key === "Down") count--;
        },
      },
      20,
      5,
    );

    driver.sendKey("Up");
    expect(count).toBe(1);
    driver.sendKey("Up");
    driver.sendKey("Up");
    expect(count).toBe(3);
    driver.sendKey("Down");
    expect(count).toBe(2);
  });

  test("tick advances state", () => {
    let frame = 0;
    const driver = new TestDriver(
      {
        render: () => Text(`Frame: ${frame}`),
        onTick: () => {
          frame++;
        },
      },
      20,
      5,
    );

    driver.tick(16);
    expect(frame).toBe(1);
    driver.tick(16);
    driver.tick(16);
    expect(frame).toBe(3);
  });

  test("resize updates dimensions", () => {
    const driver = new TestDriver(
      {
        render: (ctx) => Text(`${ctx.width}x${ctx.height}`),
      },
      80,
      24,
    );

    expect(textAt(driver.screen, 0, 0, 5)).toBe("80x24");
    driver.resize(40, 12);
    expect(textAt(driver.screen, 0, 0, 5)).toBe("40x12");
  });

  test("exit stops the app", () => {
    const driver = new TestDriver(
      {
        render: () => Text(""),
        onKey: (_event, ctrl) => {
          ctrl.exit();
        },
      },
      20,
      5,
    );

    expect(driver.running).toBe(true);
    driver.sendKey("q");
    expect(driver.running).toBe(false);
  });

  test("renders complex layouts", () => {
    const driver = new TestDriver(
      {
        render: () => Box({ border: "single", child: Text("Hello") }),
      },
      10,
      3,
    );

    const c = driver.screen;
    expect(c.get(0, 0)?.char).toBe("┌");
    expect(c.get(9, 0)?.char).toBe("┐");
    expect(c.get(0, 2)?.char).toBe("└");
    expect(c.get(9, 2)?.char).toBe("┘");
    expect(textAt(c, 1, 1, 5)).toBe("Hello");
  });

  test("sendKeys sends multiple keys", () => {
    let count = 0;
    const driver = new TestDriver(
      {
        render: () => Text(`Count: ${count}`),
        onKey: (event) => {
          if (event.key === "Up") count++;
        },
      },
      20,
      5,
    );

    driver.sendKeys("Up", "Up", "Up", "Up", "Up");
    expect(count).toBe(5);
  });

  test("type sends each character", () => {
    let value = "";
    const driver = new TestDriver(
      {
        render: () => Text(value),
        onKey: (event) => {
          if (event.key.length === 1 && !event.ctrl && !event.alt) {
            value += event.key;
          }
        },
      },
      20,
      5,
    );

    driver.type("hello");
    expect(value).toBe("hello");
  });

  test("render forces re-render", () => {
    let value = "before";
    const driver = new TestDriver({ render: () => Text(value) }, 20, 5);

    expect(driver.text).toContain("before");
    value = "after";
    driver.render();
    expect(driver.text).toContain("after");
  });

  test("app with no optional handlers works", () => {
    const driver = new TestDriver({ render: () => Text("defaults") }, 20, 5);
    expect(driver.text).toContain("defaults");
    driver.sendKey("x"); // should not crash
    driver.tick(16); // should not crash
    expect(driver.text).toContain("defaults");
  });
});
