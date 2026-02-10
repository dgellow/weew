# weew

A lightweight terminal UI library for Deno. No React, no JSX, no npm
dependencies.

## Features

- **Simple functional API** - No classes to extend, no complex lifecycle
- **Flexbox-like layouts** - Row, Column, Grid with gap, justify, align
- **Built-in components** - Box, Text, List, Progress, Spinner, Table,
  TextInput, ScrollBox, Badge, Divider
- **Keyboard input** - Full key event handling with modifiers
- **Diff-based rendering** - Only updates changed cells
- **Resize handling** - Responds to terminal size changes
- **Zero dependencies** - Pure Deno, no npm packages

## Quick Start

```typescript
import { Box, colors, isKey, run, Text } from "https://deno.land/x/weew/mod.ts";

await run({
  initialState: { count: 0 },

  render: (state) =>
    Box({
      border: "rounded",
      borderColor: colors.fg.cyan,
      title: " Counter ",
      padding: 1,
      child: Text(`Count: ${state.count}`),
    }),

  onKey: (event, state, ctx) => {
    if (isKey(event, "q")) ctx.exit();
    if (event.key === "Up") return { count: state.count + 1 };
    if (event.key === "Down") return { count: state.count - 1 };
  },
});
```

Run with: `deno run --allow-all your-app.ts`

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
import { isKey, Keys } from "weew";

onKey: ((event, state, ctx) => {
  // Check specific keys
  if (isKey(event, "q")) ctx.exit();
  if (isKey(event, "s", { ctrl: true })) save();

  // Arrow keys
  if (event.key === Keys.Up) return { selected: state.selected - 1 };
  if (event.key === Keys.Down) return { selected: state.selected + 1 };

  // Modifiers
  if (event.ctrl && event.key === "c") ctx.exit();
});
```

### Available Keys

`Enter`, `Escape`, `Tab`, `Backspace`, `Delete`, `Up`, `Down`, `Left`, `Right`,
`Home`, `End`, `PageUp`, `PageDown`, `F1`-`F12`

## Colors

```typescript
import { bg, colors, fg } from "weew";

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

## App Configuration

```typescript
run<State>({
  initialState: { ... },

  render: (state, ctx) => Component,

  onKey: (event, state, ctx) => State | void,

  onTick: (state, delta, ctx) => State | void,

  tickInterval: 16,  // ms, default ~60fps

  altScreen: true,   // Use alternate buffer

  hideCursor: true,

  onResize: (size, state, ctx) => State | void,
});
```

### AppContext

```typescript
ctx.render()           // Request re-render
ctx.setState(newState) // Update state
ctx.setState(s => ...) // Functional update
ctx.exit()             // Exit app
ctx.size()             // Get terminal size
```

## Low-level API

For one-off renders without the app loop:

```typescript
import { Box, renderOnce, Text } from "weew";

renderOnce(
  Box({
    border: "single",
    child: Text("Hello!"),
  }),
);
```

Direct terminal control:

```typescript
import {
  clearScreen,
  enterAltScreen,
  exitAltScreen,
  hideCursor,
  moveTo,
  showCursor,
  write,
} from "weew";
```
