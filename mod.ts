// weew - A lightweight terminal UI library for Deno
// No dependencies, no React, no JSX - just simple, functional components

// Core ANSI utilities
export {
  bg,
  clear,
  CSI,
  cursor,
  ESC,
  fg,
  screen,
  stripAnsi,
  style,
  styled,
  visibleLength,
} from "./src/ansi.ts";

// Terminal utilities
export {
  clearLine,
  clearScreen,
  enterAltScreen,
  exitAltScreen,
  getSize,
  hideCursor,
  isTTY,
  moveTo,
  onResize,
  setRawMode,
  showCursor,
  write,
  writeLine,
} from "./src/terminal.ts";
export type { TerminalSize } from "./src/terminal.ts";

// Canvas/rendering
export { Canvas } from "./src/canvas.ts";
export type { Cell } from "./src/canvas.ts";

// Components
export {
  borders,
  Box,
  buildStyle,
  colors,
  List,
  Progress,
  Spinner,
  Table,
  Text,
} from "./src/components.ts";
export type {
  BorderStyle,
  BoxProps,
  Component,
  ListProps,
  ProgressProps,
  Rect,
  SpinnerProps,
  Style,
  TableProps,
  TextProps,
} from "./src/components.ts";

// Layout
export {
  Center,
  Column,
  Flex,
  Grid,
  Padding,
  Positioned,
  Row,
  Stack,
} from "./src/layout.ts";
export type {
  Align,
  CenterProps,
  Direction,
  FlexChild,
  FlexProps,
  GridProps,
  Justify,
  PaddingProps,
  PositionedProps,
} from "./src/layout.ts";

// Input handling
export {
  isKey,
  keyEvents,
  KeyboardInput,
  Keys,
  readKey,
} from "./src/input.ts";
export type { KeyEvent } from "./src/input.ts";

// App runner
export { App, renderOnce, run } from "./src/app.ts";
export type { AppConfig, AppContext, RenderContext } from "./src/app.ts";
