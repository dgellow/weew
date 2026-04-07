#!/usr/bin/env -S deno run -A
// Demo app showcasing weew features

import {
  Box,
  colors,
  Column,
  denoTerminalIO,
  isKey,
  Keys,
  List,
  Progress,
  Row,
  run,
  Spinner,
  Text,
} from "../mod.ts";

let selected = 0;
let progress = 0;
let spinnerFrame = 0;
const items = ["Dashboard", "Settings", "Profile", "Help", "Exit"];

await run({
  io: denoTerminalIO(),
  render: ({ width, height }) => {
    return Column([
      // Header
      {
        component: Box({
          border: "rounded",
          borderColor: colors.fg.cyan,
          title: " weew demo ",
          titleAlign: "center",
          padding: { left: 1, right: 1 },
          child: Text({
            content: "A lightweight terminal UI library for Deno",
            style: { fg: colors.fg.gray },
            align: "center",
          }),
        }),
        height: 3,
      },

      // Main content
      {
        component: Row([
          // Left panel - Menu
          {
            component: Box({
              border: "single",
              borderColor: colors.fg.blue,
              title: " Menu ",
              padding: 1,
              child: List({
                items,
                selected,
                selectedStyle: { fg: colors.fg.cyan, bold: true },
                itemStyle: { fg: colors.fg.white },
              }),
            }),
            width: 20,
          },

          // Right panel - Content
          {
            component: Box({
              border: "single",
              borderColor: colors.fg.green,
              title: ` ${items[selected]} `,
              padding: 1,
              child: Column([
                {
                  component: Text({
                    content: `Selected: ${items[selected]}`,
                    style: { bold: true },
                  }),
                  height: 1,
                },
                {
                  component: Text({
                    content: "Use ↑/↓ to navigate, Enter to select, q to quit",
                    style: { fg: colors.fg.gray },
                  }),
                  height: 2,
                },
                {
                  component: Row([
                    {
                      component: Spinner({
                        frame: spinnerFrame,
                        color: colors.fg.yellow,
                      }),
                      width: 2,
                    },
                    { component: Text("Loading..."), flex: 1 },
                  ]),
                  height: 1,
                },
                {
                  component: Text({
                    content: "Progress:",
                    style: { fg: colors.fg.gray },
                  }),
                  height: 1,
                },
                {
                  component: Progress({
                    value: progress,
                    filledColor: colors.fg.green,
                    emptyColor: colors.fg.gray,
                    showPercent: true,
                  }),
                  height: 1,
                },
              ]),
            }),
            flex: 1,
          },
        ], { gap: 1 }),
        flex: 1,
      },

      // Footer
      {
        component: Box({
          border: "none",
          child: Text({
            content: `Size: ${width}x${height} | Press 'q' to quit`,
            style: { fg: colors.fg.gray },
            align: "center",
          }),
        }),
        height: 1,
      },
    ], { gap: 0 });
  },

  onKey: (event, ctrl) => {
    if (isKey(event, "q") || isKey(event, "c", { ctrl: true })) {
      ctrl.exit();
      return;
    }

    if (event.key === Keys.Up) {
      selected = (selected - 1 + items.length) % items.length;
    }

    if (event.key === Keys.Down) {
      selected = (selected + 1) % items.length;
    }

    if (event.key === Keys.Enter) {
      if (items[selected] === "Exit") {
        ctrl.exit();
      }
    }
  },

  onTick: () => {
    spinnerFrame++;
    progress = (progress + 0.5) % 101;
  },

  tickInterval: 80,
});
