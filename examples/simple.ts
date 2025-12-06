// Simple counter example

import { Box, colors, isKey, run, Text } from "../mod.ts";

interface State {
  count: number;
}

await run<State>({
  initialState: { count: 0 },

  render: (state) =>
    Box({
      border: "rounded",
      borderColor: colors.fg.cyan,
      title: " Counter ",
      padding: 1,
      child: Text({
        content: `Count: ${state.count}\n\n↑/↓ to change, q to quit`,
        style: { fg: colors.fg.white },
      }),
    }),

  onKey: (event, state, ctx) => {
    if (isKey(event, "q")) {
      ctx.exit();
      return undefined;
    }

    if (event.key === "Up") {
      return { count: state.count + 1 };
    }

    if (event.key === "Down") {
      return { count: state.count - 1 };
    }

    return undefined;
  },
});
