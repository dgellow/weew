# weew

A lightweight terminal UI library for Deno. No React, no JSX, no npm
dependencies.

## Features

- **Simple functional API** - No classes to extend, no complex lifecycle
- **Flexbox-like layouts** - Row, Column, Grid with gap, justify, align
- **Built-in components** - Box, Text, List, Progress, Spinner, Table
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

## License

MIT
