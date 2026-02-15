# weew

A lightweight terminal UI library for Deno.

## Design Philosophy

- **Extremely lightweight.** No runtime, no framework paradigm. Functions that
  take data, return renderable components. Not React, not Elm, not blessed.
- **Extremely performant.** Zero startup cost. Rendering thousands of rows must
  be instant. "It's a TUI so who cares" is not acceptable.
- **Excellently designed APIs.** Optimized for building real, useful TUI
  applications. Every decision intentional, based on real-world usage patterns
  and industry learnings.

## Architecture

- **Library, not framework.** Inspired by ratatui: user owns state and controls
  the loop. App handles terminal plumbing (alt screen, raw mode, event loop,
  render scheduling) but NOT state management.
- **Canvas double-buffering.** Canvas uses bufferA/bufferB swap with in-place
  clear for efficient rendering.
- **Component pattern.** Components implement `{ render(canvas, rect) }`.
  Interactive components extend this with `handleKey` returning typed updates.
- **No circular imports.** canvas.ts defines its own `ClipRect` instead of
  importing `Rect` from components.ts.

## Modules

| Module               | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `src/ansi.ts`        | ANSI escape codes, color helpers, string utilities |
| `src/canvas.ts`      | Double-buffered rendering surface with clip stack  |
| `src/components.ts`  | UI components (Text, Box, List, Table, etc.)       |
| `src/layout.ts`      | Layout primitives (Row, Column, Flex, Grid, etc.)  |
| `src/input.ts`       | Keyboard event parsing from raw terminal bytes     |
| `src/focus.ts`       | Focus group management for Tab navigation          |
| `src/app.ts`         | App runner — terminal lifecycle and event loop     |
| `src/test_driver.ts` | Headless driver for testing without a terminal     |
| `src/terminal.ts`    | Terminal I/O (raw mode, size, alt screen)          |

## Verification

```
deno fmt --check && deno lint && deno check mod.ts && deno test --allow-all src/*_test.ts
```

Also verify examples compile: `deno check examples/*.ts`
