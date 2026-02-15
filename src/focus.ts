/** Focus group — pure function for routing key events to focused items with Tab navigation. */

import type { KeyEvent } from "./input.ts";
import type { InputComponent } from "./components.ts";

/** An item in a focus group, binding an InputComponent to an update callback. */
export interface FocusItem {
  id: string;
  input: InputComponent<unknown>;
  /** Apply the component's update. Mutate your own state in this callback. */
  apply: (update: unknown) => void;
}

/** Configuration for a focus group: items, navigation behavior, and trapping. */
export interface FocusGroupConfig {
  items: FocusItem[];
  focusedId: string;
  /** Tab/Shift+Tab cycles (default: true) */
  cycle?: boolean;
  /** Trap focus — don't let unhandled events escape (for dialogs) */
  trap?: boolean;
  /** Navigation keys — default: Tab/Shift+Tab. Set to customize. */
  navigationKeys?: {
    next?: (event: KeyEvent) => boolean;
    prev?: (event: KeyEvent) => boolean;
  };
}

/** Result of handling a key event within a focus group. */
export interface FocusGroupResult {
  focusedId: string;
  handled: boolean;
}

/**
 * Route a key event through a focus group.
 * Handles Tab/Shift+Tab navigation between items and delegates other keys to the focused item's handleKey.
 * @param config - Focus group configuration (items, focused ID, cycle/trap behavior)
 * @param event - The key event to handle
 * @returns The result with updated focusedId and whether the event was handled
 */
export function handleFocusGroup(
  config: FocusGroupConfig,
  event: KeyEvent,
): FocusGroupResult {
  const { items, focusedId, trap = false } = config;
  const cycle = config.cycle ?? true;

  const isNext = config.navigationKeys?.next ??
    ((e: KeyEvent) => e.key === "Tab" && !e.shift);
  const isPrev = config.navigationKeys?.prev ??
    ((e: KeyEvent) => e.key === "Tab" && e.shift);

  // Check navigation keys
  if (isNext(event)) {
    const idx = items.findIndex((item) => item.id === focusedId);
    if (idx === -1) return { focusedId, handled: false };
    let nextIdx = idx + 1;
    if (nextIdx >= items.length) {
      nextIdx = cycle ? 0 : idx;
    }
    return { focusedId: items[nextIdx].id, handled: true };
  }

  if (isPrev(event)) {
    const idx = items.findIndex((item) => item.id === focusedId);
    if (idx === -1) return { focusedId, handled: false };
    let prevIdx = idx - 1;
    if (prevIdx < 0) {
      prevIdx = cycle ? items.length - 1 : idx;
    }
    return { focusedId: items[prevIdx].id, handled: true };
  }

  // Route to focused item
  const focused = items.find((item) => item.id === focusedId);
  if (!focused) return { focusedId, handled: false };

  const update = focused.input.handleKey(event);
  if (update !== undefined) {
    focused.apply(update);
    return { focusedId, handled: true };
  }

  // Not handled
  return { focusedId, handled: trap };
}
