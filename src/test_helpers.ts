// Test helpers for asserting canvas state

import { assertEquals } from "@std/assert";
import type { Canvas, Cell } from "./canvas.ts";

/** Assert that text at (x, y) matches expected string */
export function assertTextAt(
  canvas: Canvas,
  x: number,
  y: number,
  expected: string,
): void {
  let actual = "";
  for (let i = 0; i < expected.length; i++) {
    const cell = canvas.get(x + i, y);
    if (cell && cell.char !== "") {
      actual += cell.char;
    }
  }
  assertEquals(
    actual,
    expected,
    `Text at (${x}, ${y}): expected "${expected}", got "${actual}"`,
  );
}

/** Assert that a cell at (x, y) matches expected properties */
export function assertCellAt(
  canvas: Canvas,
  x: number,
  y: number,
  expected: Partial<Cell>,
): void {
  const cell = canvas.get(x, y);
  if (expected.char !== undefined) {
    assertEquals(
      cell?.char,
      expected.char,
      `Cell char at (${x}, ${y}): expected "${expected.char}", got "${cell?.char}"`,
    );
  }
  if (expected.fg !== undefined) {
    assertEquals(
      cell?.fg,
      expected.fg,
      `Cell fg at (${x}, ${y}): expected "${expected.fg}", got "${cell?.fg}"`,
    );
  }
  if (expected.bg !== undefined) {
    assertEquals(
      cell?.bg,
      expected.bg,
      `Cell bg at (${x}, ${y}): expected "${expected.bg}", got "${cell?.bg}"`,
    );
  }
  if (expected.style !== undefined) {
    assertEquals(
      cell?.style,
      expected.style,
      `Cell style at (${x}, ${y}): expected "${expected.style}", got "${cell?.style}"`,
    );
  }
}

/** Assert that a rectangular region matches expected text lines */
export function assertRegion(
  canvas: Canvas,
  x: number,
  y: number,
  expected: string[],
): void {
  for (let row = 0; row < expected.length; row++) {
    const expectedLine = expected[row];
    let actual = "";
    for (let col = 0; col < expectedLine.length; col++) {
      const cell = canvas.get(x + col, y + row);
      if (cell && cell.char !== "") {
        actual += cell.char;
      }
    }
    assertEquals(
      actual,
      expectedLine,
      `Region row ${row} at y=${
        y + row
      }: expected "${expectedLine}", got "${actual}"`,
    );
  }
}
