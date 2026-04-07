#!/usr/bin/env -S deno run -A
// Screen API demo — user owns the event loop
import { Box, colors, denoTerminalIO, isKey, Screen, Text } from "../mod.ts";

let count = 0;

using screen = new Screen({ io: denoTerminalIO() });

const render = () =>
  Box({
    border: "rounded",
    borderColor: colors.fg.cyan,
    title: " Counter ",
    padding: 1,
    child: Text({
      content: `Count: ${count}\n\n↑/↓ to change, q to quit`,
      style: { fg: colors.fg.white },
    }),
  });

screen.draw(render);

for await (const event of screen.events()) {
  if (event.type === "key") {
    if (isKey(event, "q")) break;
    if (event.key === "Up") count++;
    if (event.key === "Down") count--;
  }
  screen.draw(render);
}
