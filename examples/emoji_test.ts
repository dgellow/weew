// Quick emoji and animation test
import { Box, colors, Column, run, Text } from "../mod.ts";

interface State {
  frame: number;
}

const emojis = ["🎉", "🚀", "⭐", "🔥", "💯", "✨", "🎯", "🌟"];

await run<State>({
  initialState: { frame: 0 },
  tickInterval: 100,

  onTick: (state) => ({ frame: state.frame + 1 }),

  render: (state) =>
    Box({
      border: "rounded",
      borderColor: colors.fg.cyan,
      title: " Emoji Test ",
      padding: 1,
      child: Column([
        { component: Text("ASCII: Hello World!") },
        { component: Text("Emoji: 🎉 Party time! 🚀") },
        { component: Text("CJK: 你好世界 (Hello World)") },
        { component: Text("Mix: Hi🔥there✨friend") },
        { component: Text("") },
        {
          component: Text({
            content: `Animated: ${
              emojis[state.frame % emojis.length]
            } (frame ${state.frame})`,
            style: { fg: colors.fg.yellow },
          }),
        },
        { component: Text("") },
        {
          component: Text({
            content: "Press 'q' to quit",
            style: { fg: colors.fg.gray },
          }),
        },
      ]),
    }),

  onKey: (event, _state, ctx) => {
    if (event.key === "q") ctx.exit();
    return undefined;
  },
});
