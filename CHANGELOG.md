# Changelog

## 0.2.0

### Features

- component-level input handling and focus management <details><summary>Details</summary>
  Add InputComponent&lt;U&gt; interface extending Component with handleKey,
  enabling components to encapsulate their own input logic while keeping
  state-flows-down architecture.<br>
  Components with handleKey: TextInput (full text editing + readline
  shortcuts), Checkbox (toggle), Select (open/close/navigate), List
  (Up/Down/Home/End), Tabs (Left/Right), Tree (navigate/expand/collapse).<br>
  Add handleFocusGroup() for routing keys to focused items with
  Tab/Shift+Tab navigation, cycle/trap modes, and custom nav keys.<br>
  Fix parseKeyEvent: Tab (0x09) and Enter (0x0d/0x0a) now correctly
  parse as "Tab"/"Enter" instead of Ctrl+I/Ctrl+M.<br>
  Add TestDriver, test helpers, and benchmarks.
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
