# weew

A lightweight, runtime-agnostic terminal UI library. Works on Deno and Bun.

## Features

- **Simple functional API** - No classes to extend, no complex lifecycle
- **Flexbox-like layouts** - Row, Column, Grid with gap, justify, align
- **Built-in components** - Box, Text, List, Progress, Spinner, Table,
  TextInput, ScrollBox, Badge, Divider
- **Keyboard input** - Full key event handling with modifiers
- **Diff-based rendering** - Only updates changed cells
- **Resize handling** - Responds to terminal size changes
- **Runtime-agnostic core** - Canvas, components, layout, and input parsing work
  on any JS runtime
- **Zero dependencies**

## Quick Start

```typescript
import {
  Box,
  colors,
  denoTerminalIO,
  isKey,
  run,
  Text,
} from "jsr:@dgellow/weew";

let count = 0;

await run({
  io: denoTerminalIO(),
  render: () =>
    Box({
      border: "rounded",
      borderColor: colors.fg.cyan,
      title: " Counter ",
      padding: 1,
      child: Text(`Count: ${count}`),
    }),

  onKey: (event, ctrl) => {
    if (isKey(event, "q")) ctrl.exit();
    if (event.key === "Up") count++;
    if (event.key === "Down") count--;
  },
});
```

Run with: `deno run --allow-all your-app.ts`

### Bun

```typescript
import {
  Box,
  colors,
  isKey,
  nodeTerminalIO,
  run,
  Text,
} from "jsr:@dgellow/weew";

let count = 0;

await run({
  io: nodeTerminalIO(),
  render: () =>
    Box({
      border: "rounded",
      borderColor: colors.fg.cyan,
      title: " Counter ",
      padding: 1,
      child: Text(`Count: ${count}`),
    }),

  onKey: (event, ctrl) => {
    if (isKey(event, "q")) ctrl.exit();
    if (event.key === "Up") count++;
    if (event.key === "Down") count--;
  },
});
```

Run with: `bun run your-app.ts`

## Components

### Text

```typescript
Text("Hello world");

Text({
  content: "Styled text",
  style: { fg: colors.fg.cyan, bold: true },
  align: "center",
  wrap: true,
});
```

### Box

```typescript
Box({
  border: "rounded", // "single" | "double" | "rounded" | "bold" | "none"
  borderColor: colors.fg.blue,
  title: " Title ",
  titleAlign: "center",
  padding: 1, // or { top: 1, right: 2, bottom: 1, left: 2 }
  child: Text("Content"), // Use Column([...]) for multiple children
});
```

### List

```typescript
List({
  items: ["Item 1", "Item 2", "Item 3"],
  selected: 0,
  selectedStyle: { fg: colors.fg.cyan, bold: true },
  bullet: "•",
});
```

### Progress

```typescript
Progress({
  value: 75,
  filledColor: colors.fg.green,
  emptyColor: colors.fg.gray,
  showPercent: true,
});
```

### Spinner

```typescript
Spinner({
  frame: state.frame, // Increment in onTick
  label: "Loading...",
  color: colors.fg.yellow,
});
```

### Table

```typescript
Table({
  headers: ["Name", "Age", "City"],
  rows: [
    ["Alice", "30", "NYC"],
    ["Bob", "25", "LA"],
  ],
  headerStyle: { bold: true },
});
```

### TextInput

```typescript
TextInput({
  value: state.text,
  cursorPos: state.cursor,
  placeholder: "Type here...",
  focused: true,
  width: 30,
  style: { fg: colors.fg.white },
  cursorStyle: { fg: colors.fg.black, bg: colors.bg.white },
});
```

### ScrollBox

```typescript
ScrollBox({
  scrollY: state.scroll,
  contentHeight: 50,
  border: "single",
  title: "Scrollable",
  showScrollbar: true,
  child: Column(items.map((item) => ({ component: Text(item), height: 1 }))),
});
```

### Divider

```typescript
Divider(); // Horizontal "─" line

Divider({ direction: "vertical" }); // Vertical "│" line

Divider({ char: "=", style: { fg: colors.fg.gray } });
```

### Badge

```typescript
Badge({ text: "OK" }); // " OK " with default black-on-white

Badge({
  text: "Error",
  style: { fg: colors.fg.white, bg: colors.bg.red },
});
```

### FocusContainer

```typescript
FocusContainer({
  items: [
    { id: "name", component: TextInput({ value: state.name, cursorPos: 0 }) },
    { id: "email", component: TextInput({ value: state.email, cursorPos: 0 }) },
  ],
  focusedId: state.focused,
  focusedStyle: { fg: colors.fg.cyan },
  direction: "vertical",
  gap: 1,
});
```

## Layout

### Row / Column

```typescript
Row([
  { component: Text("Left"), width: 20 },
  { component: Text("Right"), flex: 1 },
], { gap: 1, justify: "between", align: "center" });

Column([
  { component: Text("Top"), height: 3 },
  { component: Text("Bottom"), flex: 1 },
]);
```

### Grid

```typescript
Grid({
  columns: 3,
  gap: 1,
  children: [Box(...), Box(...), Box(...), Box(...)],
})
```

### Spacer

A layout primitive that occupies space in Flex layouts. Returns a `FlexChild`.

```typescript
Row([
  { component: Text("Left"), width: 10 },
  Spacer({ flex: 1 }), // Pushes items apart
  { component: Text("Right"), width: 10 },
]);

Spacer({ width: 5 }); // Fixed 5-column gap
Spacer({ height: 2 }); // Fixed 2-row gap
```

### Positioned

Absolute positioning within a parent rect.

```typescript
Positioned({
  x: 5,
  y: 3,
  width: 10,
  height: 1,
  child: Text("At (5, 3)"),
});

Positioned({
  right: 0,
  bottom: 0,
  width: 10,
  height: 1,
  child: Text("Bottom-right"),
});
```

### Stack

Renders multiple components at the same position (for overlays). Last child
renders on top.

```typescript
Stack([
  Box({ border: "single", fill: " " }),
  Positioned({ x: 2, y: 1, width: 10, height: 1, child: Text("Overlay") }),
]);
```

### Flex Properties

- `flex: number` - Grow factor for available space
- `width/height: number` - Fixed size
- `minWidth/minHeight: number` - Minimum size
- `maxWidth/maxHeight: number` - Maximum size

### Justify (main axis)

`"start" | "end" | "center" | "between" | "around" | "evenly"`

### Align (cross axis)

`"start" | "end" | "center" | "stretch"`

## Input Handling

```typescript
import { isKey, Keys } from "jsr:@dgellow/weew";

// isKey is case-sensitive: isKey(event, "g") won't match "G"
onKey: ((event, ctrl) => {
  // Check specific keys
  if (isKey(event, "q")) ctrl.exit();
  if (isKey(event, "s", { ctrl: true })) save();

  // Arrow keys
  if (event.key === Keys.Up) selected--;
  if (event.key === Keys.Down) selected++;

  // Modifiers
  if (event.ctrl && event.key === "c") ctrl.exit();
});
```

### Available Keys

`Enter`, `Escape`, `Tab`, `Backspace`, `Delete`, `Up`, `Down`, `Left`, `Right`,
`Home`, `End`, `PageUp`, `PageDown`, `F1`-`F12`

## Colors

```typescript
import { bg, colors, fg } from "jsr:@dgellow/weew";

// Named colors
colors.fg.red;
colors.fg.cyan;
colors.bg.blue;

// RGB
colors.fg.rgb(255, 100, 50);
colors.bg.rgb(0, 0, 0);

// Hex
colors.fg.hex("#ff6432");

// Direct ANSI
fg.red;
bg.brightBlue;
fg.color(196); // 256 color
```

## Screen (Low-Level)

Screen gives you full control over the event loop. You own the loop, Screen
handles terminal setup/teardown and rendering. A `ScreenIO` implementation must
be provided — use `denoTerminalIO()` for real terminals.

```typescript
import { denoTerminalIO, isKey, Screen, Text } from "jsr:@dgellow/weew";

let count = 0;

using screen = new Screen({ io: denoTerminalIO() });

screen.draw(() => Text(`Count: ${count}`));

for await (const event of screen.events()) {
  if (event.type === "key") {
    if (isKey(event, "q")) break;
    if (event.key === "Up") count++;
    if (event.key === "Down") count--;
  }
  screen.draw(() => Text(`Count: ${count}`));
}
```

Async is just `await` inside the loop:

```typescript
screen.draw(() => Text("Loading..."));
const data = await fetchData();
screen.draw(() => Text(data));
```

### Testing with TestScreenIO

Screen requires a `ScreenIO` — use `TestScreenIO` for headless testing:

```typescript
import { Screen, TestScreenIO, Text } from "jsr:@dgellow/weew";

const io = new TestScreenIO(80, 24);
const screen = new Screen({ io });

screen.draw(() => Text("Hello"));
assertEquals(screen.canvas.toString().includes("Hello"), true);

io.pushKey("q");
io.close();
for await (const event of screen.events()) {
  // process events...
}
```

## run() (Callback Style)

`run()` is convenience sugar over Screen for callback-style apps:

```typescript
run({
  io: denoTerminalIO(),              // Required: runtime I/O

  render: (ctx) => Component,       // ctx has { width, height }

  onKey: (event, ctrl) => void,      // mutate your own state

  onTick: (delta, ctrl) => void,

  tickInterval: 16,  // ms, default ~60fps

  altScreen: true,   // Use alternate buffer

  hideCursor: true,

  onResize: (size) => void,
});
```

### RunControl

```typescript
ctrl.render(); // Request re-render (for async updates)
ctrl.exit(); // Exit and restore terminal
ctrl.size(); // Get terminal size
```

## One-off Rendering

For one-off renders without the app loop:

```typescript
import { Box, denoTerminalIO, renderOnce, Text } from "jsr:@dgellow/weew";

renderOnce(
  Box({
    border: "single",
    child: Text("Hello!"),
  }),
  denoTerminalIO(),
);
```

Direct terminal control (Deno-specific):

```typescript
import {
  clearScreen,
  enterAltScreen,
  exitAltScreen,
  hideCursor,
  moveTo,
  showCursor,
  write,
} from "jsr:@dgellow/weew";
```
