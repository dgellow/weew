# weew

A lightweight, runtime-agnostic terminal UI library. Works on Deno and Bun.

## Design Philosophy

- **Extremely lightweight.** No runtime, no framework paradigm. Functions that
  take data, return renderable components. Not React, not Elm, not blessed.
- **Extremely performant.** Zero startup cost. Rendering thousands of rows must
  be instant. "It's a TUI so who cares" is not acceptable.
- **Excellently designed APIs.** Optimized for building real, useful TUI
  applications. Every decision intentional, based on real-world usage patterns
  and industry learnings.

## Architecture

- **Library, not framework.** Inspired by ratatui: user owns state and the event
  loop. Screen handles terminal plumbing (alt screen, raw mode, cursor). `run()`
  is convenience sugar on top of Screen for callback-style apps.
- **Injectable I/O.** Screen requires a ScreenIO interface — no hidden runtime
  defaults. `denoTerminalIO()` and `nodeTerminalIO()` provide the runtime
  implementations. TestScreenIO provides headless testing.
- **Runtime-agnostic core.** Canvas, components, layout, focus, input parsing,
  Screen, and run() have zero runtime dependencies. Runtime-specific code lives
  in `deno_io.ts` and `node_io.ts`. ESC key disambiguation lives in the shared
  `keyEventsFrom(read)` generator — both runtimes provide a `ReadFn`.
- **Canvas double-buffering.** Canvas uses bufferA/bufferB swap with in-place
  clear for efficient rendering. `render()` returns the ANSI diff string — the
  caller (ScreenIO.flush) writes it.
- **Component pattern.** Components implement `{ render(canvas, rect) }`.
  Interactive components extend this with `handleKey` returning typed updates.
- **No circular imports.** canvas.ts defines its own `ClipRect` instead of
  importing `Rect` from components.ts.

## Modules

| Module               | Purpose                                            | Runtime  |
| -------------------- | -------------------------------------------------- | -------- |
| `src/ansi.ts`        | ANSI escape codes, color helpers, string utilities | Agnostic |
| `src/canvas.ts`      | Double-buffered rendering surface with clip stack  | Agnostic |
| `src/components.ts`  | UI components (Text, Box, List, Table, etc.)       | Agnostic |
| `src/layout.ts`      | Layout primitives (Row, Column, Flex, Grid, etc.)  | Agnostic |
| `src/input.ts`       | Key parsing, keyEventsFrom(read), ReadFn           | Agnostic |
| `src/focus.ts`       | Focus group management for Tab navigation          | Agnostic |
| `src/screen.ts`      | Screen, ScreenIO, TerminalSize, TestScreenIO       | Agnostic |
| `src/run.ts`         | run(), renderOnce(), AppConfig, RunConfig          | Agnostic |
| `src/test_driver.ts` | TestDriver — headless driver for run()-style apps  | Agnostic |
| `src/deno_io.ts`     | denoTerminalIO(), Deno terminal helpers            | Deno     |
| `src/node_io.ts`     | nodeTerminalIO() via node:process                  | Bun/Node |

## Verification

```
./scripts/lint
./scripts/test
./scripts/test-bun
```
