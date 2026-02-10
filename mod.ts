// weew - A lightweight terminal UI library for Deno
// No dependencies, no React, no JSX - just simple, functional components

// Core ANSI utilities
export {
  bg,
  charWidth,
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
export type {
  ClearCommands,
  ColorCommands,
  CursorCommands,
  ScreenCommands,
  StyleCommands,
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
  Badge,
  borders,
  Box,
  buildStyle,
  colors,
  Divider,
  FocusContainer,
  List,
  Progress,
  ScrollBox,
  Spinner,
  Table,
  Text,
  TextInput,
} from "./src/components.ts";
export type {
  BadgeProps,
  BorderStyle,
  BoxProps,
  ColorHelpers,
  Colors,
  Component,
  DividerProps,
  FocusableItem,
  FocusContainerProps,
  ListProps,
  ProgressProps,
  Rect,
  ScrollBoxProps,
  SpinnerProps,
  Style,
  TableProps,
  TextInputProps,
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
  Spacer,
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
  SpacerProps,
} from "./src/layout.ts";

// Input handling
export {
  isKey,
  KeyboardInput,
  keyEvents,
  Keys,
  parseKeyEvent,
  readKey,
} from "./src/input.ts";
export type { KeyEvent } from "./src/input.ts";

// App runner
export { App, renderOnce, run } from "./src/app.ts";
export type { AppConfig, AppContext, RenderContext } from "./src/app.ts";
