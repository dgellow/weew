import { assertEquals } from "@std/assert";
import { handleFocusGroup } from "./focus.ts";
import type { FocusItem } from "./focus.ts";
import { Checkbox, List } from "./components.ts";
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

interface TestState {
  checked: boolean;
  selected: number;
  name: string;
  cursorPos: number;
}

function makeDefaultState(): TestState {
  return { checked: false, selected: 0, name: "", cursorPos: 0 };
}

Deno.test("focus: empty items array returns handled=false", () => {
  const result = handleFocusGroup(
    { items: [], focusedId: "anything" },
    makeKeyEvent("Tab"),
    {},
  );
  assertEquals(result.handled, false);
});

Deno.test("focus: Shift+Tab wraps with cycle:true", () => {
  const state = makeDefaultState();
  const items: FocusItem<TestState>[] = [
    {
      id: "a",
      input: Checkbox({ checked: false, label: "A" }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
    {
      id: "b",
      input: Checkbox({ checked: true, label: "B" }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
  ];

  // Focus is on "a" (index 0), Shift+Tab with cycle should wrap to "b"
  const result = handleFocusGroup(
    { items, focusedId: "a", cycle: true },
    makeKeyEvent("Tab", { shift: true }),
    state,
  );
  assertEquals(result.focusedId, "b");
  assertEquals(result.handled, true);
});

Deno.test("focus: Shift+Tab stops at start with cycle:false", () => {
  const state = makeDefaultState();
  const items: FocusItem<TestState>[] = [
    {
      id: "a",
      input: Checkbox({ checked: false, label: "A" }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
    {
      id: "b",
      input: Checkbox({ checked: true, label: "B" }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
  ];

  // Focus is on "a" (index 0), Shift+Tab with no cycle stays on "a"
  const result = handleFocusGroup(
    { items, focusedId: "a", cycle: false },
    makeKeyEvent("Tab", { shift: true }),
    state,
  );
  assertEquals(result.focusedId, "a");
  assertEquals(result.handled, true);
});

Deno.test("focus: trap swallows unhandled non-navigation keys", () => {
  const state = makeDefaultState();
  const items: FocusItem<TestState>[] = [
    {
      id: "a",
      input: Checkbox({ checked: false, label: "A" }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
  ];

  // "z" is not handled by Checkbox, but trap:true should still return handled=true
  const result = handleFocusGroup(
    { items, focusedId: "a", trap: true },
    makeKeyEvent("z"),
    state,
  );
  assertEquals(result.handled, true);
  assertEquals(result.state, undefined);
});

Deno.test("focus: routes space to Checkbox (toggles checked)", () => {
  const state = makeDefaultState();
  const items: FocusItem<TestState>[] = [
    {
      id: "cb",
      input: Checkbox({ checked: false, label: "Toggle" }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
  ];

  const result = handleFocusGroup(
    { items, focusedId: "cb" },
    makeKeyEvent(" "),
    state,
  );
  assertEquals(result.handled, true);
  assertEquals(result.state?.checked, true);
});

Deno.test("focus: routes Down key to List (navigates selection)", () => {
  const state: TestState = {
    checked: false,
    selected: 0,
    name: "",
    cursorPos: 0,
  };
  const items: FocusItem<TestState>[] = [
    {
      id: "list",
      input: List({ items: ["one", "two", "three"], selected: 0 }),
      apply: (s, u) => ({
        ...s,
        selected: (u as { selected: number }).selected,
      }),
    },
  ];

  const result = handleFocusGroup(
    { items, focusedId: "list" },
    makeKeyEvent("Down"),
    state,
  );
  assertEquals(result.handled, true);
  assertEquals(result.state?.selected, 1);
});

Deno.test("focus: unknown focusedId returns handled=false", () => {
  const state = makeDefaultState();
  const items: FocusItem<TestState>[] = [
    {
      id: "a",
      input: Checkbox({ checked: false }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
  ];

  const result = handleFocusGroup(
    { items, focusedId: "nonexistent" },
    makeKeyEvent(" "),
    state,
  );
  assertEquals(result.handled, false);
  assertEquals(result.focusedId, "nonexistent");
});

Deno.test("focus: Tab navigates through 3+ items", () => {
  const state = makeDefaultState();
  const items: FocusItem<TestState>[] = [
    {
      id: "a",
      input: Checkbox({ checked: false, label: "A" }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
    {
      id: "b",
      input: Checkbox({ checked: false, label: "B" }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
    {
      id: "c",
      input: Checkbox({ checked: false, label: "C" }),
      apply: (s, u) => ({ ...s, checked: (u as { checked: boolean }).checked }),
    },
  ];

  const tabEvent = makeKeyEvent("Tab");

  // a -> b
  const r1 = handleFocusGroup(
    { items, focusedId: "a", cycle: true },
    tabEvent,
    state,
  );
  assertEquals(r1.focusedId, "b");
  assertEquals(r1.handled, true);

  // b -> c
  const r2 = handleFocusGroup(
    { items, focusedId: "b", cycle: true },
    tabEvent,
    state,
  );
  assertEquals(r2.focusedId, "c");
  assertEquals(r2.handled, true);

  // c -> a (wraps)
  const r3 = handleFocusGroup(
    { items, focusedId: "c", cycle: true },
    tabEvent,
    state,
  );
  assertEquals(r3.focusedId, "a");
  assertEquals(r3.handled, true);
});
