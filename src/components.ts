// Component system - simple, functional UI building blocks

import {
  bg,
  charWidth,
  fg,
  stripAnsi,
  style as ansiStyle,
  visibleLength,
} from "./ansi.ts";
import type { Canvas } from "./canvas.ts";
import type { KeyEvent } from "./input.ts";

// Base types
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Style {
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface Component {
  render(canvas: Canvas, rect: Rect): void;
}

/** Result of a component handling a key event. undefined = not handled, bubble up. */
export type KeyResult<U> = U | undefined | void;

/** A function that handles a key event and optionally returns an update. */
export type KeyHandler<U> = (event: KeyEvent) => KeyResult<U>;

/** A Component that can also handle key input. Extends Component, so it's backward-compatible. */
export interface InputComponent<U> extends Component {
  handleKey: KeyHandler<U>;
}

// Update types for interactive components
export interface TextInputUpdate {
  value: string;
  cursorPos: number;
}

export interface CheckboxUpdate {
  checked: boolean;
}

export interface SelectUpdate {
  selected: number;
  open: boolean;
}

export interface ListUpdate {
  selected: number;
}

export interface TabsUpdate {
  activeTab: string;
}

export interface TreeUpdate {
  selected: string;
  toggled?: string;
}

// Style helpers
export function buildStyle(s: Style): string {
  let result = "";
  if (s.bold) result += ansiStyle.bold;
  if (s.dim) result += ansiStyle.dim;
  if (s.italic) result += ansiStyle.italic;
  if (s.underline) result += ansiStyle.underline;
  return result;
}

// Color helpers interface
export interface ColorHelpers {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  gray: string;
  rgb: (r: number, g: number, b: number) => string;
  hex: (hex: string) => string;
}

export interface Colors {
  fg: ColorHelpers;
  bg: ColorHelpers;
}

// Color helpers for convenience
export const colors: Colors = {
  fg: {
    black: fg.black,
    red: fg.red,
    green: fg.green,
    yellow: fg.yellow,
    blue: fg.blue,
    magenta: fg.magenta,
    cyan: fg.cyan,
    white: fg.white,
    gray: fg.brightBlack,
    rgb: fg.rgb,
    hex: (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return fg.rgb(r, g, b);
    },
  },
  bg: {
    black: bg.black,
    red: bg.red,
    green: bg.green,
    yellow: bg.yellow,
    blue: bg.blue,
    magenta: bg.magenta,
    cyan: bg.cyan,
    white: bg.white,
    gray: bg.brightBlack,
    rgb: bg.rgb,
    hex: (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return bg.rgb(r, g, b);
    },
  },
};

// Text component
export interface TextProps {
  content: string;
  style?: Style;
  wrap?: boolean;
  align?: "left" | "center" | "right";
}

export function Text(props: TextProps | string): Component {
  const p = typeof props === "string" ? { content: props } : props;

  return {
    render(canvas: Canvas, rect: Rect) {
      const styleStr = p.style ? buildStyle(p.style) : undefined;
      const lines = p.wrap ? wrapText(p.content, rect.width) : [p.content];

      for (let i = 0; i < lines.length && i < rect.height; i++) {
        let line = lines[i];
        const visLen = visibleLength(line);

        // Handle alignment
        let x = rect.x;
        if (p.align === "center") {
          x = rect.x + Math.floor((rect.width - visLen) / 2);
        } else if (p.align === "right") {
          x = rect.x + rect.width - visLen;
        }

        // Truncate if needed
        if (visLen > rect.width) {
          line = truncateText(line, rect.width);
        }

        canvas.text(x, rect.y + i, line, {
          fg: p.style?.fg,
          bg: p.style?.bg,
          style: styleStr,
        });
      }
    },
  };
}

// Box border characters
export const borders = {
  single: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
  },
  double: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
  },
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
  },
  bold: {
    topLeft: "┏",
    topRight: "┓",
    bottomLeft: "┗",
    bottomRight: "┛",
    horizontal: "━",
    vertical: "┃",
  },
  none: null,
};

export type BorderStyle = keyof typeof borders;

// Box component
export interface BoxProps {
  border?: BorderStyle;
  borderColor?: string;
  title?: string;
  titleAlign?: "left" | "center" | "right";
  padding?: number | {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  fill?: string;
  style?: Style;
  /** Single child component. Use Column([...]) for multiple children. */
  child?: Component;
}

export function Box(props: BoxProps = {}): Component {
  const border = props.border ?? "single";
  const borderChars = borders[border];
  const padding = normalizePadding(props.padding ?? 0);

  return {
    render(canvas: Canvas, rect: Rect) {
      // Fill background if specified
      if (props.fill || props.style?.bg) {
        canvas.fill(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          props.fill ?? " ",
          {
            bg: props.style?.bg,
          },
        );
      }

      // Draw border
      if (borderChars) {
        const bc = props.borderColor;

        // Corners
        canvas.set(rect.x, rect.y, { char: borderChars.topLeft, fg: bc });
        canvas.set(rect.x + rect.width - 1, rect.y, {
          char: borderChars.topRight,
          fg: bc,
        });
        canvas.set(rect.x, rect.y + rect.height - 1, {
          char: borderChars.bottomLeft,
          fg: bc,
        });
        canvas.set(rect.x + rect.width - 1, rect.y + rect.height - 1, {
          char: borderChars.bottomRight,
          fg: bc,
        });

        // Top and bottom edges
        for (let x = 1; x < rect.width - 1; x++) {
          canvas.set(rect.x + x, rect.y, {
            char: borderChars.horizontal,
            fg: bc,
          });
          canvas.set(rect.x + x, rect.y + rect.height - 1, {
            char: borderChars.horizontal,
            fg: bc,
          });
        }

        // Left and right edges
        for (let y = 1; y < rect.height - 1; y++) {
          canvas.set(rect.x, rect.y + y, {
            char: borderChars.vertical,
            fg: bc,
          });
          canvas.set(rect.x + rect.width - 1, rect.y + y, {
            char: borderChars.vertical,
            fg: bc,
          });
        }

        // Draw title
        if (props.title) {
          const title = ` ${props.title} `;
          const titleLen = visibleLength(title);
          let titleX = rect.x + 2;

          if (props.titleAlign === "center") {
            titleX = rect.x + Math.floor((rect.width - titleLen) / 2);
          } else if (props.titleAlign === "right") {
            titleX = rect.x + rect.width - titleLen - 2;
          }

          canvas.text(titleX, rect.y, title, { fg: bc });
        }
      }

      // Calculate content area
      const borderOffset = borderChars ? 1 : 0;
      const contentRect: Rect = {
        x: rect.x + borderOffset + padding.left,
        y: rect.y + borderOffset + padding.top,
        width: rect.width - (borderOffset * 2) - padding.left - padding.right,
        height: rect.height - (borderOffset * 2) - padding.top - padding.bottom,
      };

      // Render child
      if (props.child) {
        props.child.render(canvas, contentRect);
      }
    },
  };
}

// Progress bar component
export interface ProgressProps {
  value: number; // 0-100
  width?: number;
  filled?: string;
  empty?: string;
  filledColor?: string;
  emptyColor?: string;
  showPercent?: boolean;
}

export function Progress(props: ProgressProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      const width = props.width ?? rect.width;
      const filled = props.filled ?? "█";
      const empty = props.empty ?? "░";
      const percent = Math.max(0, Math.min(100, props.value));
      const filledWidth = Math.round((percent / 100) * width);

      for (let i = 0; i < width; i++) {
        const isFilled = i < filledWidth;
        canvas.set(rect.x + i, rect.y, {
          char: isFilled ? filled : empty,
          fg: isFilled ? props.filledColor : props.emptyColor,
        });
      }

      if (props.showPercent) {
        const percentText = ` ${Math.round(percent)}%`;
        canvas.text(rect.x + width + 1, rect.y, percentText);
      }
    },
  };
}

// Spinner component
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface SpinnerProps {
  frame: number;
  label?: string;
  color?: string;
}

export function Spinner(props: SpinnerProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      const frameIndex = props.frame % spinnerFrames.length;
      canvas.set(rect.x, rect.y, {
        char: spinnerFrames[frameIndex],
        fg: props.color,
      });

      if (props.label) {
        canvas.text(rect.x + 2, rect.y, props.label);
      }
    },
  };
}

// List component
export interface ListProps {
  items: (string | Component)[];
  selected?: number;
  selectedStyle?: Style;
  itemStyle?: Style;
  bullet?: string;
  itemHeight?: number;
  renderItem?: (
    item: string | Component,
    index: number,
    selected: boolean,
  ) => Component;
}

export function List(props: ListProps): InputComponent<ListUpdate> {
  return {
    render(canvas: Canvas, rect: Rect) {
      const bullet = props.bullet ?? "•";
      const itemH = props.itemHeight ?? 1;

      for (
        let i = 0;
        i < props.items.length && i * itemH < rect.height;
        i++
      ) {
        const isSelected = props.selected === i;
        const item = props.items[i];

        // Custom render callback takes priority
        if (props.renderItem) {
          const component = props.renderItem(item, i, isSelected);
          component.render(canvas, {
            x: rect.x,
            y: rect.y + i * itemH,
            width: rect.width,
            height: itemH,
          });
          continue;
        }

        // Component items render directly
        if (typeof item !== "string") {
          const itemRect: Rect = {
            x: rect.x,
            y: rect.y + i * itemH,
            width: rect.width,
            height: itemH,
          };
          if (isSelected && props.selectedStyle?.bg) {
            canvas.fill(
              itemRect.x,
              itemRect.y,
              itemRect.width,
              itemRect.height,
              " ",
              { bg: props.selectedStyle.bg },
            );
          }
          item.render(canvas, itemRect);
          continue;
        }

        // String items with bullet prefix (original behavior)
        const style = isSelected ? props.selectedStyle : props.itemStyle;
        const prefix = isSelected ? "› " : `${bullet} `;
        const text = prefix + item;

        canvas.text(rect.x, rect.y + i * itemH, text, {
          fg: style?.fg,
          bg: style?.bg,
          style: style ? buildStyle(style) : undefined,
        });
      }
    },

    handleKey(event: KeyEvent): ListUpdate | undefined {
      const selected = props.selected ?? 0;
      if (event.key === "Up") {
        return { selected: Math.max(0, selected - 1) };
      }
      if (event.key === "Down") {
        return { selected: Math.min(props.items.length - 1, selected + 1) };
      }
      if (event.key === "Home") return { selected: 0 };
      if (event.key === "End") {
        return { selected: props.items.length - 1 };
      }
      return undefined;
    },
  };
}

// Table component
export interface TableProps {
  headers?: string[];
  rows: string[][];
  columnWidths?: number[];
  headerStyle?: Style;
  cellStyle?: Style;
  border?: boolean;
  selectedRow?: number;
  selectedStyle?: Style;
  rowStyle?: (rowIndex: number, row: string[]) => Style | undefined;
  cellStyleFn?: (
    rowIndex: number,
    colIndex: number,
    value: string,
  ) => Style | undefined;
}

export function Table(props: TableProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      const { headers, rows, border = true } = props;
      const separatorWidth = border ? 3 : 1; // " │ " vs " "

      // Calculate column widths
      const allRows = headers ? [headers, ...rows] : rows;
      const colCount = Math.max(...allRows.map((r) => r.length));
      const colWidths = props.columnWidths ??
        calculateColumnWidths(allRows, rect.width, colCount, separatorWidth);

      let y = rect.y;

      // Draw headers
      if (headers) {
        let x = rect.x;
        for (let i = 0; i < headers.length; i++) {
          const text = padOrTruncate(headers[i], colWidths[i]);
          canvas.text(x, y, text, {
            fg: props.headerStyle?.fg,
            bg: props.headerStyle?.bg,
            style: props.headerStyle
              ? buildStyle(props.headerStyle)
              : undefined,
          });
          if (border && i < headers.length - 1) {
            canvas.set(x + colWidths[i] + 1, y, { char: "│" });
          }
          x += colWidths[i] + separatorWidth;
        }
        y++;

        // Draw header separator
        if (border) {
          let x = rect.x;
          for (let i = 0; i < colWidths.length; i++) {
            canvas.hline(x, y, colWidths[i], "─");
            if (i < colWidths.length - 1) {
              canvas.set(x + colWidths[i] + 1, y, { char: "┼" });
            }
            x += colWidths[i] + separatorWidth;
          }
          y++;
        }
      }

      // Draw rows
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        if (y >= rect.y + rect.height) break;
        const row = rows[rowIdx];
        const isSelectedRow = props.selectedRow === rowIdx;

        let x = rect.x;
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const text = padOrTruncate(row[colIdx], colWidths[colIdx] ?? 10);

          // Style priority: cellStyleFn > rowStyle > selectedRow > cellStyle
          const cellFnStyle = props.cellStyleFn?.(
            rowIdx,
            colIdx,
            row[colIdx],
          );
          const rowFnStyle = props.rowStyle?.(rowIdx, row);
          const selectedFnStyle = isSelectedRow
            ? props.selectedStyle
            : undefined;
          const effectiveStyle = cellFnStyle ?? rowFnStyle ??
            selectedFnStyle ?? props.cellStyle;

          canvas.text(x, y, text, {
            fg: effectiveStyle?.fg,
            bg: effectiveStyle?.bg,
            style: effectiveStyle ? buildStyle(effectiveStyle) : undefined,
          });
          if (border && colIdx < row.length - 1) {
            canvas.set(x + (colWidths[colIdx] ?? 10) + 1, y, { char: "│" });
          }
          x += (colWidths[colIdx] ?? 10) + separatorWidth;
        }
        y++;
      }
    },
  };
}

// Helper functions
function normalizePadding(
  p: number | { top?: number; right?: number; bottom?: number; left?: number },
) {
  if (typeof p === "number") {
    return { top: p, right: p, bottom: p, left: p };
  }
  return {
    top: p.top ?? 0,
    right: p.right ?? 0,
    bottom: p.bottom ?? 0,
    left: p.left ?? 0,
  };
}

function wrapText(text: string, width: number): string[] {
  // Handle newlines first
  const paragraphs = text.split("\n");
  const result: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph === "") {
      result.push("");
      continue;
    }

    const words = paragraph.split(" ");
    let currentLine = "";
    let currentWidth = 0;

    for (const word of words) {
      const wordWidth = visibleLength(word);

      if (currentWidth + wordWidth + (currentLine ? 1 : 0) <= width) {
        currentLine += (currentLine ? " " : "") + word;
        currentWidth = visibleLength(currentLine);
      } else {
        if (currentLine) result.push(currentLine);

        // Handle words longer than width
        if (wordWidth > width) {
          let remaining = word;
          while (visibleLength(remaining) > width) {
            // Find break point
            let breakPoint = 0;
            let w = 0;
            for (const char of remaining) {
              const cw = charWidth(char);
              if (w + cw > width) break;
              w += cw;
              breakPoint++;
            }
            result.push(remaining.slice(0, breakPoint));
            remaining = remaining.slice(breakPoint);
          }
          currentLine = remaining;
          currentWidth = visibleLength(remaining);
        } else {
          currentLine = word;
          currentWidth = wordWidth;
        }
      }
    }
    if (currentLine) result.push(currentLine);
  }

  return result;
}

function truncateText(text: string, maxWidth: number): string {
  const stripped = stripAnsi(text);
  if (visibleLength(stripped) <= maxWidth) return text;
  let width = 0;
  let i = 0;
  for (const char of stripped) {
    const w = charWidth(char);
    if (width + w > maxWidth - 1) break;
    width += w;
    i++;
  }
  return [...stripped].slice(0, i).join("") + "…";
}

function padOrTruncate(text: string, width: number): string {
  const stripped = stripAnsi(text);
  const visWidth = visibleLength(stripped);
  if (visWidth > width) return truncateText(text, width);
  return text + " ".repeat(width - visWidth);
}

function calculateColumnWidths(
  rows: string[][],
  totalWidth: number,
  colCount: number,
  separatorWidth: number,
): number[] {
  const widths: number[] = [];
  for (let i = 0; i < colCount; i++) {
    const maxWidth = Math.max(...rows.map((r) => visibleLength(r[i] ?? "")));
    widths.push(
      Math.min(maxWidth, Math.floor(totalWidth / colCount) - separatorWidth),
    );
  }
  return widths;
}

// ScrollBox - scrollable container for content taller than viewport
export interface ScrollBoxProps {
  scrollY: number;
  contentHeight: number;
  border?: BorderStyle;
  borderColor?: string;
  title?: string;
  showScrollbar?: boolean;
  child: Component;
}

export function ScrollBox(props: ScrollBoxProps): Component {
  const border = props.border ?? "single";
  const borderChars = borders[border];

  return {
    render(canvas: Canvas, rect: Rect) {
      // Draw border
      if (borderChars) {
        const bc = props.borderColor;

        canvas.set(rect.x, rect.y, { char: borderChars.topLeft, fg: bc });
        canvas.set(rect.x + rect.width - 1, rect.y, {
          char: borderChars.topRight,
          fg: bc,
        });
        canvas.set(rect.x, rect.y + rect.height - 1, {
          char: borderChars.bottomLeft,
          fg: bc,
        });
        canvas.set(rect.x + rect.width - 1, rect.y + rect.height - 1, {
          char: borderChars.bottomRight,
          fg: bc,
        });

        for (let x = 1; x < rect.width - 1; x++) {
          canvas.set(rect.x + x, rect.y, {
            char: borderChars.horizontal,
            fg: bc,
          });
          canvas.set(rect.x + x, rect.y + rect.height - 1, {
            char: borderChars.horizontal,
            fg: bc,
          });
        }

        for (let y = 1; y < rect.height - 1; y++) {
          canvas.set(rect.x, rect.y + y, {
            char: borderChars.vertical,
            fg: bc,
          });
        }

        if (props.title) {
          const title = ` ${props.title} `;
          canvas.text(rect.x + 2, rect.y, title, { fg: bc });
        }
      }

      // Draw scrollbar
      const borderOffset = borderChars ? 1 : 0;
      const viewportHeight = rect.height - borderOffset * 2;
      const showScrollbar = props.showScrollbar !== false &&
        props.contentHeight > viewportHeight;

      if (showScrollbar) {
        const scrollbarX = rect.x + rect.width - 1;
        const scrollRatio = props.scrollY /
          Math.max(1, props.contentHeight - viewportHeight);
        const thumbSize = Math.max(
          1,
          Math.floor(
            (viewportHeight / props.contentHeight) * viewportHeight,
          ),
        );
        const thumbPos = Math.floor(scrollRatio * (viewportHeight - thumbSize));

        for (let y = 0; y < viewportHeight; y++) {
          const isThumb = y >= thumbPos && y < thumbPos + thumbSize;
          canvas.set(scrollbarX, rect.y + borderOffset + y, {
            char: isThumb ? "█" : "░",
            fg: props.borderColor,
          });
        }
      }

      // Render child with scroll offset, clipped to viewport
      const viewportWidth = rect.width - borderOffset * 2 -
        (showScrollbar ? 1 : 0);
      const contentRect: Rect = {
        x: rect.x + borderOffset,
        y: rect.y + borderOffset - props.scrollY,
        width: viewportWidth,
        height: props.contentHeight,
      };

      canvas.pushClip({
        x: rect.x + borderOffset,
        y: rect.y + borderOffset,
        width: viewportWidth,
        height: viewportHeight,
      });
      props.child.render(canvas, contentRect);
      canvas.popClip();
    },
  };
}

// Scrollbar position utility — reusable for custom scrollable components
export interface ScrollbarInfo {
  thumbPos: number;
  thumbSize: number;
}

export function scrollbarPosition(params: {
  contentHeight: number;
  viewportHeight: number;
  scrollY: number;
}): ScrollbarInfo {
  const { contentHeight, viewportHeight, scrollY } = params;
  const scrollRatio = scrollY / Math.max(1, contentHeight - viewportHeight);
  const thumbSize = Math.max(
    1,
    Math.floor((viewportHeight / contentHeight) * viewportHeight),
  );
  const thumbPos = Math.floor(scrollRatio * (viewportHeight - thumbSize));
  return { thumbPos, thumbSize };
}

// VirtualScrollBox - scrollable container that only renders visible content
export interface VisibleRange {
  start: number;
  end: number;
}

export interface VirtualScrollBoxProps {
  scrollY: number;
  contentHeight: number;
  border?: BorderStyle;
  borderColor?: string;
  title?: string;
  showScrollbar?: boolean;
  /** Called with the visible row range. Render ONLY visible items. */
  renderSlice: (
    canvas: Canvas,
    rect: Rect,
    range: VisibleRange,
  ) => void;
}

export function VirtualScrollBox(props: VirtualScrollBoxProps): Component {
  const border = props.border ?? "single";
  const borderChars = borders[border];

  return {
    render(canvas: Canvas, rect: Rect) {
      // Draw border
      if (borderChars) {
        const bc = props.borderColor;

        canvas.set(rect.x, rect.y, { char: borderChars.topLeft, fg: bc });
        canvas.set(rect.x + rect.width - 1, rect.y, {
          char: borderChars.topRight,
          fg: bc,
        });
        canvas.set(rect.x, rect.y + rect.height - 1, {
          char: borderChars.bottomLeft,
          fg: bc,
        });
        canvas.set(rect.x + rect.width - 1, rect.y + rect.height - 1, {
          char: borderChars.bottomRight,
          fg: bc,
        });

        for (let x = 1; x < rect.width - 1; x++) {
          canvas.set(rect.x + x, rect.y, {
            char: borderChars.horizontal,
            fg: bc,
          });
          canvas.set(rect.x + x, rect.y + rect.height - 1, {
            char: borderChars.horizontal,
            fg: bc,
          });
        }

        for (let y = 1; y < rect.height - 1; y++) {
          canvas.set(rect.x, rect.y + y, {
            char: borderChars.vertical,
            fg: bc,
          });
        }

        if (props.title) {
          const title = ` ${props.title} `;
          canvas.text(rect.x + 2, rect.y, title, { fg: bc });
        }
      }

      // Calculate viewport dimensions
      const borderOffset = borderChars ? 1 : 0;
      const viewportHeight = rect.height - borderOffset * 2;
      const showScrollbar = props.showScrollbar !== false &&
        props.contentHeight > viewportHeight;

      // Draw scrollbar
      if (showScrollbar) {
        const scrollbarX = rect.x + rect.width - 1;
        const { thumbPos, thumbSize } = scrollbarPosition({
          contentHeight: props.contentHeight,
          viewportHeight,
          scrollY: props.scrollY,
        });

        for (let y = 0; y < viewportHeight; y++) {
          const isThumb = y >= thumbPos && y < thumbPos + thumbSize;
          canvas.set(scrollbarX, rect.y + borderOffset + y, {
            char: isThumb ? "█" : "░",
            fg: props.borderColor,
          });
        }
      }

      // Calculate visible range and render only the visible slice
      const viewportWidth = rect.width - borderOffset * 2 -
        (showScrollbar ? 1 : 0);
      const start = Math.max(0, Math.floor(props.scrollY));
      const end = Math.min(
        props.contentHeight,
        start + viewportHeight,
      );

      const sliceRect: Rect = {
        x: rect.x + borderOffset,
        y: rect.y + borderOffset,
        width: viewportWidth,
        height: viewportHeight,
      };

      props.renderSlice(canvas, sliceRect, { start, end });
    },
  };
}

// VirtualList - virtualized list with render callback for each item
export interface VirtualListProps<T> {
  items: T[];
  selected?: number;
  itemHeight?: number;
  scrollY: number;
  border?: BorderStyle;
  borderColor?: string;
  title?: string;
  showScrollbar?: boolean;
  renderItem: (item: T, index: number, selected: boolean) => Component;
}

export function VirtualList<T>(props: VirtualListProps<T>): Component {
  const itemHeight = props.itemHeight ?? 1;
  const contentHeight = props.items.length * itemHeight;

  return VirtualScrollBox({
    scrollY: props.scrollY,
    contentHeight,
    border: props.border,
    borderColor: props.borderColor,
    title: props.title,
    showScrollbar: props.showScrollbar,
    renderSlice(canvas: Canvas, rect: Rect, range: VisibleRange) {
      const startItem = Math.floor(range.start / itemHeight);
      const endItem = Math.min(
        props.items.length,
        Math.ceil(range.end / itemHeight),
      );

      for (let i = startItem; i < endItem; i++) {
        const isSelected = props.selected === i;
        const itemY = rect.y + (i * itemHeight - range.start);
        const itemRect: Rect = {
          x: rect.x,
          y: itemY,
          width: rect.width,
          height: itemHeight,
        };

        const component = props.renderItem(
          props.items[i],
          i,
          isSelected,
        );
        component.render(canvas, itemRect);
      }
    },
  });
}

// TextInput - editable text field
export interface TextInputProps {
  value: string;
  cursorPos: number;
  placeholder?: string;
  style?: Style;
  cursorStyle?: Style;
  focused?: boolean;
  width?: number;
}

export function TextInput(
  props: TextInputProps,
): InputComponent<TextInputUpdate> {
  return {
    render(canvas: Canvas, rect: Rect) {
      const width = props.width ?? rect.width;
      const value = props.value ||
        (props.focused ? "" : props.placeholder ?? "");
      const styleStr = props.style ? buildStyle(props.style) : undefined;
      const isEmpty = !props.value && !props.focused;

      // Calculate visible portion if text is longer than width
      let displayValue = value;
      let cursorX = props.cursorPos;

      if (visibleLength(value) > width) {
        // Scroll text to keep cursor visible
        const start = Math.max(0, props.cursorPos - width + 1);
        displayValue = value.slice(start, start + width);
        cursorX = props.cursorPos - start;
      }

      // Render text
      canvas.text(rect.x, rect.y, displayValue, {
        fg: isEmpty ? colors.fg.gray : props.style?.fg,
        bg: props.style?.bg,
        style: styleStr,
      });

      // Render cursor if focused
      if (props.focused) {
        const cursorChar = cursorX < displayValue.length
          ? displayValue[cursorX]
          : " ";
        canvas.set(rect.x + cursorX, rect.y, {
          char: cursorChar,
          fg: props.cursorStyle?.bg ?? colors.fg.black,
          bg: props.cursorStyle?.fg ?? colors.bg.white,
          style: buildStyle(props.cursorStyle ?? { bold: true }),
        });
      }

      // Fill remaining width with spaces
      for (let i = visibleLength(displayValue); i < width; i++) {
        canvas.set(rect.x + i, rect.y, {
          char: " ",
          bg: props.style?.bg,
        });
      }
    },

    handleKey(event: KeyEvent): TextInputUpdate | undefined {
      const { value, cursorPos } = props;

      // Character insertion
      if (event.key.length === 1 && !event.ctrl && !event.alt) {
        return {
          value: value.slice(0, cursorPos) + event.key + value.slice(cursorPos),
          cursorPos: cursorPos + 1,
        };
      }
      if (event.key === "Backspace" && cursorPos > 0) {
        return {
          value: value.slice(0, cursorPos - 1) + value.slice(cursorPos),
          cursorPos: cursorPos - 1,
        };
      }
      if (event.key === "Delete" && cursorPos < value.length) {
        return {
          value: value.slice(0, cursorPos) + value.slice(cursorPos + 1),
          cursorPos,
        };
      }
      if (event.key === "Left") {
        return { value, cursorPos: Math.max(0, cursorPos - 1) };
      }
      if (event.key === "Right") {
        return { value, cursorPos: Math.min(value.length, cursorPos + 1) };
      }
      if (event.key === "Home") return { value, cursorPos: 0 };
      if (event.key === "End") return { value, cursorPos: value.length };

      // Readline-style shortcuts
      if (event.key === "a" && event.ctrl) return { value, cursorPos: 0 };
      if (event.key === "e" && event.ctrl) {
        return { value, cursorPos: value.length };
      }
      if (event.key === "k" && event.ctrl) {
        return { value: value.slice(0, cursorPos), cursorPos };
      }
      if (event.key === "u" && event.ctrl) {
        return { value: value.slice(cursorPos), cursorPos: 0 };
      }

      return undefined;
    },
  };
}

// Focus management helpers
export interface FocusableItem {
  id: string;
  component: Component;
}

export interface FocusContainerProps {
  items: FocusableItem[];
  focusedId: string;
  focusedStyle?: Style;
  direction?: "horizontal" | "vertical";
  gap?: number;
  itemHeight?: number;
}

export function FocusContainer(props: FocusContainerProps): Component {
  const direction = props.direction ?? "vertical";
  const gap = props.gap ?? 0;

  return {
    render(canvas: Canvas, rect: Rect) {
      let offset = 0;

      for (const item of props.items) {
        const isFocused = item.id === props.focusedId;

        if (direction === "vertical") {
          const h = props.itemHeight ?? 1;
          const itemRect: Rect = {
            x: rect.x,
            y: rect.y + offset,
            width: rect.width,
            height: h,
          };

          if (isFocused && props.focusedStyle) {
            // Draw focus indicator
            canvas.text(itemRect.x, itemRect.y, "▸", {
              fg: props.focusedStyle.fg,
              style: buildStyle(props.focusedStyle),
            });
            itemRect.x += 2;
            itemRect.width -= 2;
          }

          item.component.render(canvas, itemRect);
          offset += h + gap;
        } else {
          // Horizontal layout - each item gets equal width
          const itemWidth = Math.floor(
            (rect.width - gap * (props.items.length - 1)) / props.items.length,
          );
          const itemRect: Rect = {
            x: rect.x + offset,
            y: rect.y,
            width: itemWidth,
            height: rect.height,
          };

          if (isFocused && props.focusedStyle?.bg) {
            canvas.fill(
              itemRect.x,
              itemRect.y,
              itemRect.width,
              itemRect.height,
              " ",
              { bg: props.focusedStyle.bg },
            );
          }

          item.component.render(canvas, itemRect);
          offset += itemWidth + gap;
        }
      }
    },
  };
}

// Divider - horizontal or vertical line separator
export interface DividerProps {
  direction?: "horizontal" | "vertical";
  char?: string;
  style?: Style;
}

export function Divider(props: DividerProps = {}): Component {
  const direction = props.direction ?? "horizontal";
  const char = props.char ?? (direction === "horizontal" ? "─" : "│");

  return {
    render(canvas: Canvas, rect: Rect) {
      if (direction === "horizontal") {
        canvas.hline(rect.x, rect.y, rect.width, char, {
          fg: props.style?.fg,
          bg: props.style?.bg,
        });
      } else {
        canvas.vline(rect.x, rect.y, rect.height, char, {
          fg: props.style?.fg,
          bg: props.style?.bg,
        });
      }
    },
  };
}

// Badge - small label with background
export interface BadgeProps {
  text: string;
  style?: Style;
  padding?: number | { left?: number; right?: number };
}

export function Badge(props: BadgeProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      let padLeft = 1;
      let padRight = 1;
      if (typeof props.padding === "number") {
        padLeft = props.padding;
        padRight = props.padding;
      } else if (props.padding) {
        padLeft = props.padding.left ?? 1;
        padRight = props.padding.right ?? 1;
      }
      const text = " ".repeat(padLeft) + props.text + " ".repeat(padRight);
      canvas.text(rect.x, rect.y, text, {
        fg: props.style?.fg ?? colors.fg.black,
        bg: props.style?.bg ?? colors.bg.white,
        style: props.style ? buildStyle(props.style) : undefined,
      });
    },
  };
}

// Dialog - modal overlay with dimmed background
export interface DialogProps {
  title?: string;
  border?: BorderStyle;
  borderColor?: string;
  width: number;
  height: number;
  child: Component;
  dimBg?: string;
}

export function Dialog(props: DialogProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      // Dim background
      canvas.fill(rect.x, rect.y, rect.width, rect.height, " ", {
        bg: props.dimBg ?? colors.bg.black,
      });

      // Center the dialog box
      const x = rect.x + Math.floor((rect.width - props.width) / 2);
      const y = rect.y + Math.floor((rect.height - props.height) / 2);

      const box = Box({
        border: props.border ?? "rounded",
        borderColor: props.borderColor,
        title: props.title,
        child: props.child,
      });

      box.render(canvas, { x, y, width: props.width, height: props.height });
    },
  };
}

// Tabs - tab bar with switchable content panels
export interface Tab {
  id: string;
  label: string;
  content: Component;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  tabStyle?: Style;
  activeTabStyle?: Style;
}

export function Tabs(props: TabsProps): InputComponent<TabsUpdate> {
  return {
    render(canvas: Canvas, rect: Rect) {
      // Render tab bar on first row
      let x = rect.x;
      for (const tab of props.tabs) {
        const isActive = tab.id === props.activeTab;
        const style = isActive ? props.activeTabStyle : props.tabStyle;
        const label = ` ${tab.label} `;

        canvas.text(x, rect.y, label, {
          fg: style?.fg ?? (isActive ? colors.fg.white : colors.fg.gray),
          bg: style?.bg,
          style: style ? buildStyle(style) : undefined,
        });

        // Underline active tab
        if (isActive) {
          canvas.hline(x, rect.y + 1, visibleLength(label), "─", {
            fg: style?.fg ?? colors.fg.white,
          });
        }

        x += visibleLength(label) + 1;
      }

      // Render active tab content below tab bar
      const activeTab = props.tabs.find((t) => t.id === props.activeTab);
      if (activeTab) {
        activeTab.content.render(canvas, {
          x: rect.x,
          y: rect.y + 2,
          width: rect.width,
          height: rect.height - 2,
        });
      }
    },

    handleKey(event: KeyEvent): TabsUpdate | undefined {
      const idx = props.tabs.findIndex((t) => t.id === props.activeTab);
      if (event.key === "Left" && idx > 0) {
        return { activeTab: props.tabs[idx - 1].id };
      }
      if (event.key === "Right" && idx < props.tabs.length - 1) {
        return { activeTab: props.tabs[idx + 1].id };
      }
      return undefined;
    },
  };
}

// Select - dropdown-style selector
export interface SelectProps {
  options: string[];
  selected: number;
  open?: boolean;
  style?: Style;
  selectedStyle?: Style;
  maxVisible?: number;
}

export function Select(props: SelectProps): InputComponent<SelectUpdate> {
  return {
    render(canvas: Canvas, rect: Rect) {
      const selectedText = props.options[props.selected] ?? "";
      const indicator = props.open ? "▾" : "▸";

      // Render the closed display
      canvas.text(rect.x, rect.y, `${indicator} ${selectedText}`, {
        fg: props.style?.fg,
        bg: props.style?.bg,
        style: props.style ? buildStyle(props.style) : undefined,
      });

      // Render dropdown if open
      if (props.open) {
        const maxVis = props.maxVisible ?? Math.min(props.options.length, 10);
        for (let i = 0; i < maxVis && i < props.options.length; i++) {
          const isSelected = i === props.selected;
          const style = isSelected ? props.selectedStyle : props.style;
          const prefix = isSelected ? "› " : "  ";
          canvas.text(rect.x, rect.y + 1 + i, prefix + props.options[i], {
            fg: style?.fg,
            bg: style?.bg,
            style: style ? buildStyle(style) : undefined,
          });
        }
      }
    },

    handleKey(event: KeyEvent): SelectUpdate | undefined {
      const { selected, open } = props;
      if (!open) {
        if (event.key === " " || event.key === "Enter") {
          return { selected, open: true };
        }
        return undefined;
      }
      // Open state
      if (event.key === "Up") {
        return { selected: Math.max(0, selected - 1), open: true };
      }
      if (event.key === "Down") {
        return {
          selected: Math.min(props.options.length - 1, selected + 1),
          open: true,
        };
      }
      if (event.key === "Enter" || event.key === " ") {
        return { selected, open: false };
      }
      if (event.key === "Escape") {
        return { selected, open: false };
      }
      return undefined;
    },
  };
}

// Checkbox
export interface CheckboxProps {
  checked: boolean;
  label?: string;
  style?: Style;
  checkedChar?: string;
  uncheckedChar?: string;
}

export function Checkbox(
  props: CheckboxProps,
): InputComponent<CheckboxUpdate> {
  return {
    render(canvas: Canvas, rect: Rect) {
      const checked = props.checkedChar ?? "✓";
      const unchecked = props.uncheckedChar ?? " ";
      const box = props.checked ? `[${checked}]` : `[${unchecked}]`;
      const text = props.label ? `${box} ${props.label}` : box;

      canvas.text(rect.x, rect.y, text, {
        fg: props.style?.fg,
        bg: props.style?.bg,
        style: props.style ? buildStyle(props.style) : undefined,
      });
    },

    handleKey(event: KeyEvent): CheckboxUpdate | undefined {
      if (event.key === " " || event.key === "Enter") {
        return { checked: !props.checked };
      }
      return undefined;
    },
  };
}

// Tree - recursive node tree
export interface TreeNode {
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
}

export interface TreeProps {
  nodes: TreeNode[];
  selected?: string;
  indent?: number;
  style?: Style;
  selectedStyle?: Style;
  renderNode?: (
    node: TreeNode,
    depth: number,
    expanded: boolean,
  ) => Component;
}

export function Tree(props: TreeProps): InputComponent<TreeUpdate> {
  const indent = props.indent ?? 2;

  // Collect visible node labels in render order
  function getVisibleLabels(nodes: TreeNode[]): string[] {
    const labels: string[] = [];
    function walk(ns: TreeNode[]): void {
      for (const node of ns) {
        labels.push(node.label);
        if (
          node.children && node.children.length > 0 &&
          (node.expanded ?? false)
        ) {
          walk(node.children);
        }
      }
    }
    walk(nodes);
    return labels;
  }

  // Find a node by label
  function findNode(
    nodes: TreeNode[],
    label: string,
  ): { node: TreeNode; hasChildren: boolean } | undefined {
    for (const node of nodes) {
      if (node.label === label) {
        return {
          node,
          hasChildren: !!(node.children && node.children.length > 0),
        };
      }
      if (
        node.children && node.children.length > 0 &&
        (node.expanded ?? false)
      ) {
        const found = findNode(node.children, label);
        if (found) return found;
      }
    }
    return undefined;
  }

  // Find parent label of a node
  function findParentLabel(
    nodes: TreeNode[],
    label: string,
    parent?: string,
  ): string | undefined {
    for (const node of nodes) {
      if (node.label === label) return parent;
      if (
        node.children && node.children.length > 0 &&
        (node.expanded ?? false)
      ) {
        const found = findParentLabel(node.children, label, node.label);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  return {
    render(canvas: Canvas, rect: Rect) {
      let y = rect.y;

      function renderNodes(nodes: TreeNode[], depth: number): void {
        for (const node of nodes) {
          if (y >= rect.y + rect.height) return;

          const hasChildren = node.children && node.children.length > 0;
          const expanded = node.expanded ?? false;
          const isSelected = node.label === props.selected;
          const style = isSelected ? props.selectedStyle : props.style;

          if (props.renderNode) {
            const component = props.renderNode(node, depth, expanded);
            component.render(canvas, {
              x: rect.x + depth * indent,
              y,
              width: rect.width - depth * indent,
              height: 1,
            });
          } else {
            const prefix = hasChildren ? (expanded ? "▾ " : "▸ ") : "  ";
            const padding = " ".repeat(depth * indent);
            canvas.text(rect.x, y, padding + prefix + node.label, {
              fg: style?.fg,
              bg: style?.bg,
              style: style ? buildStyle(style) : undefined,
            });
          }

          y++;

          if (hasChildren && expanded) {
            renderNodes(node.children!, depth + 1);
          }
        }
      }

      renderNodes(props.nodes, 0);
    },

    handleKey(event: KeyEvent): TreeUpdate | undefined {
      const visible = getVisibleLabels(props.nodes);
      if (visible.length === 0) return undefined;

      const selected = props.selected ?? visible[0];
      const idx = visible.indexOf(selected);
      if (idx === -1) return undefined;

      if (event.key === "Up" && idx > 0) {
        return { selected: visible[idx - 1] };
      }
      if (event.key === "Down" && idx < visible.length - 1) {
        return { selected: visible[idx + 1] };
      }

      const found = findNode(props.nodes, selected);
      if (!found) return undefined;

      if (event.key === "Left") {
        if (found.hasChildren && (found.node.expanded ?? false)) {
          return { selected, toggled: selected };
        }
        const parentLabel = findParentLabel(props.nodes, selected);
        if (parentLabel !== undefined) {
          return { selected: parentLabel };
        }
        return undefined;
      }
      if (event.key === "Right" || event.key === "Enter") {
        if (found.hasChildren && !(found.node.expanded ?? false)) {
          return { selected, toggled: selected };
        }
        return undefined;
      }

      return undefined;
    },
  };
}

// Toast - notification overlay
export interface ToastProps {
  message: string;
  style?: Style;
  position?: "top" | "bottom";
  width?: number;
}

export function Toast(props: ToastProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      const width = props.width ??
        Math.min(visibleLength(props.message) + 4, rect.width);
      const x = rect.x + Math.floor((rect.width - width) / 2);
      const y = props.position === "bottom" ? rect.y + rect.height - 1 : rect.y;

      // Fill background
      canvas.fill(x, y, width, 1, " ", {
        bg: props.style?.bg ?? colors.bg.white,
      });

      // Center text
      const textX = x + Math.floor((width - visibleLength(props.message)) / 2);
      canvas.text(textX, y, props.message, {
        fg: props.style?.fg ?? colors.fg.black,
        bg: props.style?.bg ?? colors.bg.white,
        style: props.style ? buildStyle(props.style) : undefined,
      });
    },
  };
}
