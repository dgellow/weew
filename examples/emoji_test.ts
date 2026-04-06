// Quick emoji and animation test
import { Box, colors, Column, denoTerminalIO, run, Text } from "../mod.ts";

const emojis = ["🎉", "🚀", "⭐", "🔥", "💯", "✨", "🎯", "🌟"];

let frame = 0;

await run({
  io: denoTerminalIO(),
  tickInterval: 100,

  onTick: () => {
    frame++;
  },

  render: () =>
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
              emojis[frame % emojis.length]
            } (frame ${frame})`,
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

  onKey: (event, ctrl) => {
    if (event.key === "q") ctrl.exit();
  },
});
