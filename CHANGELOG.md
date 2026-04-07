# Changelog

## 0.6.0

### Features

- add Collapsible component

### Bug Fixes

- use keyEventsFrom in nodeTerminalIO, fix close() hang on blocked stdin read

### Code Refactoring

- rename terminal.ts to deno_io.ts, move denoTerminalIO and TerminalSize to proper homes
- deduplicate music example into music-app/ with shared app logic
- extract keyEventsFrom for shared ESC disambiguation, fix double-ESC bug

### Chores

- add shebangs to all example entrypoints
- scripts delegate to deno tasks, remove hardcoded file globs

## 0.5.0

### â ï¸ Breaking Changes

- runtime-agnostic core, Bun support via nodeTerminalIO

## 0.4.0

### Ã¢ÂÂ Ã¯Â¸Â Breaking Changes

- add Screen primitive, rename App types to Run

### Chores

- formatting

## 0.3.0

### ÃÂ¢ÃÂÃÂ ÃÂ¯ÃÂ¸ÃÂ Breaking Changes

- remove state from App, fix Shift+Tab, case-sensitive isKey

BREAKING CHANGES:<br> App no longer manages state. User owns state via closures:

- AppConfig/AppContext/TestDriver lose generic &lt;S&gt; parameter
- Callbacks: onKey(event, ctx), onTick(delta, ctx), render(ctx)
- No initialState, no setState, no state returns
- No tick loop unless onTick is provided; ctx.render() renders directly<br>
  handleFocusGroup simplified to match closure architecture:
- FocusItem/FocusGroupConfig/FocusGroupResult lose generic &lt;S&gt;
- apply is now (update) =&gt; void, no state threading
- No state parameter or return<br> isKey() and matchesKeySpec() are now
  case-sensitive, enabling vim-style bindings (g vs G).<br> Bug fixes:
- Parse Shift+Tab (CSI Z / ESC [ Z) in both plain and modified forms<br> New:
- TestDriver.type() sends each character as individual key events
- CLAUDE.md with design philosophy and architecture overview

### Features

- custom navigation keys, VirtualList input, JSDoc, tests, benchmarks
  <details><summary>Details</summary>
  - Add NavigationKeys type and keys/pageSize props to List and VirtualList for
    custom key bindings (j/k, Ctrl+d/u) and PageUp/PageDown support
  - Change VirtualList to return InputComponent&lt;VirtualListUpdate&gt; with
    handleKey navigation and automatic scroll-into-view
  - Add TestDriver.sendKeys() and findText() convenience methods
  - Add JSDoc to all exported symbols across all source files
  - Add ~100 new tests: app_test.ts, focus_test.ts, expanded ansi/canvas/
    components/layout/test_driver tests
  - Add ~18 new benchmarks: toAnsi, input parsing, focus routing, more
    components, real-world dashboard scenario
  - Add bench task to deno.json
  - Export NavigationKeys and VirtualListUpdate from mod.ts

</details>

## 0.2.0

### Features

- component-level input handling and focus management
  <details><summary>Details</summary> Add InputComponent&lt;U&gt; interface
  extending Component with handleKey, enabling components to encapsulate their
  own input logic while keeping state-flows-down architecture.<br> Components
  with handleKey: TextInput (full text editing + readline shortcuts), Checkbox
  (toggle), Select (open/close/navigate), List (Up/Down/Home/End), Tabs
  (Left/Right), Tree (navigate/expand/collapse).<br> Add handleFocusGroup() for
  routing keys to focused items with Tab/Shift+Tab navigation, cycle/trap modes,
  and custom nav keys.<br> Fix parseKeyEvent: Tab (0x09) and Enter (0x0d/0x0a)
  now correctly parse as "Tab"/"Enter" instead of Ctrl+I/Ctrl+M.<br> Add
  TestDriver, test helpers, and benchmarks.

</details>

### Chores

- add scripts/{lint,format,test} and split CI into distinct jobs

## 0.1.3

### Chores

- fix package name

## 0.1.2

### Chores

- formatting
- add license

## 0.1.1

### CI

- add JSR publish workflow and update CI
