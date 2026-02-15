// Simple counter example

import { Box, colors, isKey, run, Text } from "../mod.ts";

let count = 0;

await run({
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

  onKey: (event, ctx) => {
    if (isKey(event, "q")) {
      ctx.exit();
      return;
    }

    if (event.key === "Up") count++;
    if (event.key === "Down") count--;
  },
});
