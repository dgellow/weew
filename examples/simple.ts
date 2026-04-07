#!/usr/bin/env -S deno run -A
// Simple counter example

import { Box, colors, denoTerminalIO, isKey, run, Text } from "../mod.ts";

let count = 0;

await run({
  io: denoTerminalIO(),
  render: () =>
    Box({
      border: "rounded",
      borderColor: colors.fg.cyan,
      title: " Counter ",
      padding: 1,
      child: Text({
        content: `Count: ${count}\n\n↑/↓ to change, q to quit`,
        style: { fg: colors.fg.white },
      }),
    }),

  onKey: (event, ctrl) => {
    if (isKey(event, "q")) {
      ctrl.exit();
      return;
    }

    if (event.key === "Up") count++;
    if (event.key === "Down") count--;
  },
});
