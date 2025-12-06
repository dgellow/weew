// Demo app showcasing weew features

import {
  Box,
  colors,
  Column,
  isKey,
  Keys,
  List,
  Progress,
  Row,
  run,
  Spinner,
  Text,
} from "../mod.ts";

interface State {
  selected: number;
  progress: number;
  spinnerFrame: number;
  items: string[];
}

await run<State>({
  initialState: {
    selected: 0,
    progress: 0,
    spinnerFrame: 0,
    items: ["Dashboard", "Settings", "Profile", "Help", "Exit"],
  },

  render: (state, { width, height }) => {
    return Column([
      // Header
      {
        component: Box({
          border: "rounded",
          borderColor: colors.fg.cyan,
          title: " weew demo ",
          titleAlign: "center",
          padding: { left: 1, right: 1 },
          children: Text({
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
              children: List({
                items: state.items,
                selected: state.selected,
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
              title: ` ${state.items[state.selected]} `,
              padding: 1,
              children: Column([
                {
                  component: Text({
                    content: `Selected: ${state.items[state.selected]}`,
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
                        frame: state.spinnerFrame,
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
                    value: state.progress,
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
          children: Text({
            content: `Size: ${width}x${height} | Press 'q' to quit`,
            style: { fg: colors.fg.gray },
            align: "center",
          }),
        }),
        height: 1,
      },
    ], { gap: 0 });
  },

  onKey: (event, state, ctx) => {
    if (isKey(event, "q") || isKey(event, "c", { ctrl: true })) {
      ctx.exit();
      return;
    }

    if (event.key === Keys.Up) {
      return {
        ...state,
        selected: (state.selected - 1 + state.items.length) %
          state.items.length,
      };
    }

    if (event.key === Keys.Down) {
      return {
        ...state,
        selected: (state.selected + 1) % state.items.length,
      };
    }

    if (event.key === Keys.Enter) {
      if (state.items[state.selected] === "Exit") {
        ctx.exit();
      }
    }

    return undefined;
  },

  onTick: (state) => {
    return {
      ...state,
      spinnerFrame: state.spinnerFrame + 1,
      progress: (state.progress + 0.5) % 101,
    };
  },

  tickInterval: 80,
});
