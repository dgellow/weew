/**
 * weew — A lightweight terminal UI library for Deno.
 * No dependencies, no React, no JSX — just simple, functional components.
 * @module
 */

// Core ANSI utilities
export {
  bg,
  charWidth,
  clear,
  CSI,
  cursor,
  ESC,
  fg,
  osc,
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
  OscCommands,
  ScreenCommands,
  StyleCommands,
} from "./src/ansi.ts";

// Terminal utilities
export {
  bell,
  clearLine,
  clearScreen,
  enterAltScreen,
  exitAltScreen,
  getSize,
  hideCursor,
  isTTY,
  moveTo,
  noColor,
  onResize,
  prefersReducedMotion,
  setRawMode,
  setTitle,
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
  Checkbox,
  colors,
  Dialog,
  Divider,
  FocusContainer,
  List,
  Progress,
  scrollbarPosition,
  ScrollBox,
  Select,
  Spinner,
  Table,
  Tabs,
  Text,
  TextInput,
  Toast,
  Tree,
  VirtualList,
  VirtualScrollBox,
} from "./src/components.ts";
export type {
  BadgeProps,
  BorderStyle,
  BoxProps,
  CheckboxProps,
  CheckboxUpdate,
  ColorHelpers,
  Colors,
  Component,
  DialogProps,
  DividerProps,
  FocusableItem,
  FocusContainerProps,
  InputComponent,
  KeyHandler,
  KeyResult,
  ListProps,
  ListUpdate,
  NavigationKeys,
  ProgressProps,
  Rect,
  ScrollbarInfo,
  ScrollBoxProps,
  SelectProps,
  SelectUpdate,
  SpinnerProps,
  Style,
  Tab,
  TableProps,
  TabsProps,
  TabsUpdate,
  TextInputProps,
  TextInputUpdate,
  TextProps,
  ToastProps,
  TreeNode,
  TreeProps,
  TreeUpdate,
  VirtualListProps,
  VirtualListUpdate,
  VirtualScrollBoxProps,
  VisibleRange,
} from "./src/components.ts";

// Focus management
export { handleFocusGroup } from "./src/focus.ts";
export type {
  FocusGroupConfig,
  FocusGroupResult,
  FocusItem,
} from "./src/focus.ts";

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

// Screen — low-level terminal session
export { Screen, TestScreenIO } from "./src/screen.ts";
export type {
  RenderContext,
  ScreenConfig,
  ScreenEvent,
  ScreenIO,
} from "./src/screen.ts";

// run() — convenience wrapper over Screen
export { renderOnce, run } from "./src/run.ts";
export type { RunConfig, RunControl } from "./src/run.ts";

// Testing
export { TestDriver } from "./src/test_driver.ts";
export {
  assertCellAt,
  assertRegion,
  assertTextAt,
} from "./src/test_helpers.ts";
