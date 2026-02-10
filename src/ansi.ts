// ANSI escape code utilities for terminal manipulation

export const ESC: string = "\x1b";
export const CSI: string = `${ESC}[`;

// Type definitions for ANSI objects
export interface CursorCommands {
  hide: string;
  show: string;
  home: string;
  to: (x: number, y: number) => string;
  up: (n?: number) => string;
  down: (n?: number) => string;
  right: (n?: number) => string;
  left: (n?: number) => string;
  save: string;
  restore: string;
}

export interface ClearCommands {
  screen: string;
  line: string;
  toEnd: string;
  toStart: string;
}

export interface StyleCommands {
  reset: string;
  bold: string;
  dim: string;
  italic: string;
  underline: string;
  blink: string;
  inverse: string;
  hidden: string;
  strikethrough: string;
}

export interface ColorCommands {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  default: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  color: (n: number) => string;
  rgb: (r: number, g: number, b: number) => string;
}

export interface ScreenCommands {
  alt: string;
  main: string;
}

// Cursor movement
export const cursor: CursorCommands = {
  hide: `${CSI}?25l`,
  show: `${CSI}?25h`,
  home: `${CSI}H`,
  to: (x: number, y: number): string => `${CSI}${y + 1};${x + 1}H`,
  up: (n = 1): string => `${CSI}${n}A`,
  down: (n = 1): string => `${CSI}${n}B`,
  right: (n = 1): string => `${CSI}${n}C`,
  left: (n = 1): string => `${CSI}${n}D`,
  save: `${ESC}7`,
  restore: `${ESC}8`,
};

// Screen clearing
export const clear: ClearCommands = {
  screen: `${CSI}2J`,
  line: `${CSI}2K`,
  toEnd: `${CSI}0J`,
  toStart: `${CSI}1J`,
};

// Text styles
export const style: StyleCommands = {
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  italic: `${CSI}3m`,
  underline: `${CSI}4m`,
  blink: `${CSI}5m`,
  inverse: `${CSI}7m`,
  hidden: `${CSI}8m`,
  strikethrough: `${CSI}9m`,
};

// Foreground colors
export const fg: ColorCommands = {
  black: `${CSI}30m`,
  red: `${CSI}31m`,
  green: `${CSI}32m`,
  yellow: `${CSI}33m`,
  blue: `${CSI}34m`,
  magenta: `${CSI}35m`,
  cyan: `${CSI}36m`,
  white: `${CSI}37m`,
  default: `${CSI}39m`,
  brightBlack: `${CSI}90m`,
  brightRed: `${CSI}91m`,
  brightGreen: `${CSI}92m`,
  brightYellow: `${CSI}93m`,
  brightBlue: `${CSI}94m`,
  brightMagenta: `${CSI}95m`,
  brightCyan: `${CSI}96m`,
  brightWhite: `${CSI}97m`,
  color: (n: number): string => `${CSI}38;5;${n}m`,
  rgb: (r: number, g: number, b: number): string =>
    `${CSI}38;2;${r};${g};${b}m`,
};

// Background colors
export const bg: ColorCommands = {
  black: `${CSI}40m`,
  red: `${CSI}41m`,
  green: `${CSI}42m`,
  yellow: `${CSI}43m`,
  blue: `${CSI}44m`,
  magenta: `${CSI}45m`,
  cyan: `${CSI}46m`,
  white: `${CSI}47m`,
  default: `${CSI}49m`,
  brightBlack: `${CSI}100m`,
  brightRed: `${CSI}101m`,
  brightGreen: `${CSI}102m`,
  brightYellow: `${CSI}103m`,
  brightBlue: `${CSI}104m`,
  brightMagenta: `${CSI}105m`,
  brightCyan: `${CSI}106m`,
  brightWhite: `${CSI}107m`,
  color: (n: number): string => `${CSI}48;5;${n}m`,
  rgb: (r: number, g: number, b: number): string =>
    `${CSI}48;2;${r};${g};${b}m`,
};

// Alternative screen buffer
export const screen: ScreenCommands = {
  alt: `${CSI}?1049h`,
  main: `${CSI}?1049l`,
};

// Strip ANSI codes from string
// deno-lint-ignore no-control-regex
const ANSI_REGEX = /\x1b(?:\[[0-9;?]*[a-zA-Z~]|\].*?(?:\x07|\x1b\\)|\([A-Z])/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, "");
}

/**
 * Get the display width of a character.
 * Returns 2 for wide characters (CJK, emoji), 0 for combining marks, 1 otherwise.
 */
export function charWidth(char: string): number {
  const code = char.codePointAt(0);
  if (code === undefined) return 0;

  // Combining marks and zero-width characters
  if (
    (code >= 0x0300 && code <= 0x036f) || // Combining Diacritical Marks
    (code >= 0x1ab0 && code <= 0x1aff) || // Combining Diacritical Marks Extended
    (code >= 0x1dc0 && code <= 0x1dff) || // Combining Diacritical Marks Supplement
    (code >= 0x20d0 && code <= 0x20ff) || // Combining Diacritical Marks for Symbols
    (code >= 0xfe20 && code <= 0xfe2f) || // Combining Half Marks
    code === 0x200b || // Zero Width Space
    code === 0x200c || // Zero Width Non-Joiner
    code === 0x200d || // Zero Width Joiner
    code === 0xfeff // Zero Width No-Break Space
  ) {
    return 0;
  }

  // Wide characters: CJK, fullwidth forms, emoji
  if (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2600 && code <= 0x26ff) || // Miscellaneous Symbols
    (code >= 0x2700 && code <= 0x27bf) || // Dingbats (includes ❤)
    (code >= 0x2e80 && code <= 0x9fff) || // CJK
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0xfe10 && code <= 0xfe1f) || // Vertical forms
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms
    (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth Forms
    (code >= 0x20000 && code <= 0x2fffd) || // CJK Extension B+
    (code >= 0x30000 && code <= 0x3fffd) || // CJK Extension G+
    (code >= 0x1f300 && code <= 0x1f9ff) || // Misc Symbols and Pictographs, Emoticons, etc.
    (code >= 0x1fa00 && code <= 0x1faff) // Chess, symbols, etc.
  ) {
    return 2;
  }

  return 1;
}

/**
 * Get visible width of string (accounting for ANSI codes and wide characters)
 */
export function visibleLength(str: string): number {
  const stripped = stripAnsi(str);
  let width = 0;
  for (const char of stripped) {
    width += charWidth(char);
  }
  return width;
}

// Wrap text with style and reset
export function styled(text: string, ...styles: string[]): string {
  if (styles.length === 0) return text;
  return styles.join("") + text + style.reset;
}
