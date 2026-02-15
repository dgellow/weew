import { assertEquals } from "@std/assert";
import { handleFocusGroup } from "./focus.ts";
import type { FocusItem } from "./focus.ts";
import { Checkbox, List } from "./components.ts";
import type { CheckboxUpdate, ListUpdate } from "./components.ts";
import type { KeyEvent } from "./input.ts";

function makeKeyEvent(
  key: string,
  modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean },
): KeyEvent {
  return {
    key,
    ctrl: modifiers?.ctrl ?? false,
    alt: modifiers?.alt ?? false,
    shift: modifiers?.shift ?? false,
    meta: false,
    raw: new Uint8Array(),
  };
}

Deno.test("focus: empty items array returns handled=false", () => {
  const result = handleFocusGroup(
    { items: [], focusedId: "anything" },
    makeKeyEvent("Tab"),
  );
  assertEquals(result.handled, false);
});

Deno.test("focus: Shift+Tab wraps with cycle:true", () => {
  const items: FocusItem[] = [
    {
      id: "a",
      input: Checkbox({ checked: false, label: "A" }),
      apply: () => {},
    },
    {
      id: "b",
      input: Checkbox({ checked: true, label: "B" }),
      apply: () => {},
    },
  ];

  // Focus is on "a" (index 0), Shift+Tab with cycle should wrap to "b"
  const result = handleFocusGroup(
    { items, focusedId: "a", cycle: true },
    makeKeyEvent("Tab", { shift: true }),
  );
  assertEquals(result.focusedId, "b");
  assertEquals(result.handled, true);
});

Deno.test("focus: Shift+Tab stops at start with cycle:false", () => {
  const items: FocusItem[] = [
    {
      id: "a",
      input: Checkbox({ checked: false, label: "A" }),
      apply: () => {},
    },
    {
      id: "b",
      input: Checkbox({ checked: true, label: "B" }),
      apply: () => {},
    },
  ];

  // Focus is on "a" (index 0), Shift+Tab with no cycle stays on "a"
  const result = handleFocusGroup(
    { items, focusedId: "a", cycle: false },
    makeKeyEvent("Tab", { shift: true }),
  );
  assertEquals(result.focusedId, "a");
  assertEquals(result.handled, true);
});

Deno.test("focus: trap swallows unhandled non-navigation keys", () => {
  const items: FocusItem[] = [
    {
      id: "a",
      input: Checkbox({ checked: false, label: "A" }),
      apply: () => {},
    },
  ];

  // "z" is not handled by Checkbox, but trap:true should still return handled=true
  const result = handleFocusGroup(
    { items, focusedId: "a", trap: true },
    makeKeyEvent("z"),
  );
  assertEquals(result.handled, true);
});

Deno.test("focus: routes space to Checkbox (toggles checked)", () => {
  let checked = false;
  const items: FocusItem[] = [
    {
      id: "cb",
      input: Checkbox({ checked: false, label: "Toggle" }),
      apply: (u) => {
        checked = (u as CheckboxUpdate).checked;
      },
    },
  ];

  const result = handleFocusGroup(
    { items, focusedId: "cb" },
    makeKeyEvent(" "),
  );
  assertEquals(result.handled, true);
  assertEquals(checked, true);
});

Deno.test("focus: routes Down key to List (navigates selection)", () => {
  let selected = 0;
  const items: FocusItem[] = [
    {
      id: "list",
      input: List({ items: ["one", "two", "three"], selected: 0 }),
      apply: (u) => {
        selected = (u as ListUpdate).selected;
      },
    },
  ];

  const result = handleFocusGroup(
    { items, focusedId: "list" },
    makeKeyEvent("Down"),
  );
  assertEquals(result.handled, true);
  assertEquals(selected, 1);
});

Deno.test("focus: unknown focusedId returns handled=false", () => {
  const items: FocusItem[] = [
    {
      id: "a",
      input: Checkbox({ checked: false }),
      apply: () => {},
    },
  ];

  const result = handleFocusGroup(
    { items, focusedId: "nonexistent" },
    makeKeyEvent(" "),
  );
  assertEquals(result.handled, false);
  assertEquals(result.focusedId, "nonexistent");
});

Deno.test("focus: Tab navigates through 3+ items", () => {
  const items: FocusItem[] = [
    {
      id: "a",
      input: Checkbox({ checked: false, label: "A" }),
      apply: () => {},
    },
    {
      id: "b",
      input: Checkbox({ checked: false, label: "B" }),
      apply: () => {},
    },
    {
      id: "c",
      input: Checkbox({ checked: false, label: "C" }),
      apply: () => {},
    },
  ];

  const tabEvent = makeKeyEvent("Tab");

  // a -> b
  const r1 = handleFocusGroup(
    { items, focusedId: "a", cycle: true },
    tabEvent,
  );
  assertEquals(r1.focusedId, "b");
  assertEquals(r1.handled, true);

  // b -> c
  const r2 = handleFocusGroup(
    { items, focusedId: "b", cycle: true },
    tabEvent,
  );
  assertEquals(r2.focusedId, "c");
  assertEquals(r2.handled, true);

  // c -> a (wraps)
  const r3 = handleFocusGroup(
    { items, focusedId: "c", cycle: true },
    tabEvent,
  );
  assertEquals(r3.focusedId, "a");
  assertEquals(r3.handled, true);
});
