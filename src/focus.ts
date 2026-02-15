// Focus group — pure function for routing key events to focused items with Tab navigation

import type { KeyEvent } from "./input.ts";
import type { InputComponent } from "./components.ts";

export interface FocusItem<S> {
  id: string;
  input: InputComponent<unknown>;
  /** Map the component's update to a new app state */
  apply: (state: S, update: unknown) => S;
}

export interface FocusGroupConfig<S> {
  items: FocusItem<S>[];
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

export interface FocusGroupResult<S> {
  state?: S;
  focusedId: string;
  handled: boolean;
}

export function handleFocusGroup<S>(
  config: FocusGroupConfig<S>,
  event: KeyEvent,
  state: S,
): FocusGroupResult<S> {
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
    const newState = focused.apply(state, update);
    return { state: newState, focusedId, handled: true };
  }

  // Not handled
  return { focusedId, handled: trap };
}
