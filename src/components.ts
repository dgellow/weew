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
  items: string[];
  selected?: number;
  selectedStyle?: Style;
  itemStyle?: Style;
  bullet?: string;
}

export function List(props: ListProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      const bullet = props.bullet ?? "•";

      for (let i = 0; i < props.items.length && i < rect.height; i++) {
        const isSelected = props.selected === i;
        const style = isSelected ? props.selectedStyle : props.itemStyle;
        const prefix = isSelected ? "› " : `${bullet} `;
        const text = prefix + props.items[i];

        canvas.text(rect.x, rect.y + i, text, {
          fg: style?.fg,
          bg: style?.bg,
          style: style ? buildStyle(style) : undefined,
        });
      }
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
      for (const row of rows) {
        if (y >= rect.y + rect.height) break;

        let x = rect.x;
        for (let i = 0; i < row.length; i++) {
          const text = padOrTruncate(row[i], colWidths[i] ?? 10);
          canvas.text(x, y, text, {
            fg: props.cellStyle?.fg,
            bg: props.cellStyle?.bg,
          });
          if (border && i < row.length - 1) {
            canvas.set(x + (colWidths[i] ?? 10) + 1, y, { char: "│" });
          }
          x += (colWidths[i] ?? 10) + separatorWidth;
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

export function TextInput(props: TextInputProps): Component {
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
}

export function Badge(props: BadgeProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      const text = ` ${props.text} `;
      canvas.text(rect.x, rect.y, text, {
        fg: props.style?.fg ?? colors.fg.black,
        bg: props.style?.bg ?? colors.bg.white,
        style: props.style ? buildStyle(props.style) : undefined,
      });
    },
  };
}
