// Component system - simple, functional UI building blocks

import {
  bg,
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
  if (s.fg) result += s.fg;
  if (s.bg) result += s.bg;
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
  children?: Component | Component[];
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

      // Render children
      if (props.children) {
        const children = Array.isArray(props.children)
          ? props.children
          : [props.children];
        let y = contentRect.y;

        for (const child of children) {
          if (y >= contentRect.y + contentRect.height) break;
          child.render(canvas, {
            ...contentRect,
            y,
            height: contentRect.y + contentRect.height - y,
          });
          y++; // Simple vertical stacking
        }
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

      // Calculate column widths
      const allRows = headers ? [headers, ...rows] : rows;
      const colCount = Math.max(...allRows.map((r) => r.length));
      const colWidths = props.columnWidths ??
        calculateColumnWidths(allRows, rect.width, colCount);

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
          x += colWidths[i] + (border ? 3 : 1);
        }
        y++;

        // Draw header separator
        if (border) {
          let x = rect.x;
          for (let i = 0; i < colWidths.length; i++) {
            canvas.hline(x, y, colWidths[i], "─");
            x += colWidths[i] + 3;
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
          x += (colWidths[i] ?? 10) + (border ? 3 : 1);
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
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

function truncateText(text: string, maxWidth: number): string {
  const stripped = stripAnsi(text);
  if (stripped.length <= maxWidth) return text;
  return stripped.slice(0, maxWidth - 1) + "…";
}

function padOrTruncate(text: string, width: number): string {
  const stripped = stripAnsi(text);
  if (stripped.length > width) {
    return stripped.slice(0, width - 1) + "…";
  }
  return text + " ".repeat(width - stripped.length);
}

function calculateColumnWidths(
  rows: string[][],
  totalWidth: number,
  colCount: number,
): number[] {
  const widths: number[] = [];
  for (let i = 0; i < colCount; i++) {
    const maxWidth = Math.max(...rows.map((r) => visibleLength(r[i] ?? "")));
    widths.push(Math.min(maxWidth, Math.floor(totalWidth / colCount) - 3));
  }
  return widths;
}
