// Collapsible sections demo — accordion-style foldable panels

import {
  Box,
  Collapsible,
  colors,
  Column,
  denoTerminalIO,
  Divider,
  isKey,
  List,
  Progress,
  Row,
  run,
  Table,
  Text,
  TextInput,
} from "../mod.ts";

// ── State ─────────────────────────────────────────────

interface Section {
  id: string;
  label: string;
  expanded: boolean;
}

const sections: Section[] = [
  { id: "profile", label: "Profile", expanded: true },
  { id: "stats", label: "Statistics", expanded: false },
  { id: "settings", label: "Settings", expanded: false },
  { id: "logs", label: "Recent Logs", expanded: false },
];

let focusedSection = 0;
const nameValue = "Alice";
const nameCursor = 5;
const emailValue = "alice@example.com";
const emailCursor = 17;

// ── Render ────────────────────────────────────────────

function profileContent() {
  return Column([
    {
      component: Row([
        {
          component: Text({
            content: "Name:  ",
            style: { fg: colors.fg.gray },
          }),
          width: 8,
        },
        {
          component: TextInput({
            value: nameValue,
            cursorPos: nameCursor,
            focused: sections[0].expanded && focusedSection === 0,
            style: { fg: colors.fg.white },
          }),
          flex: 1,
        },
      ]),
      height: 1,
    },
    {
      component: Row([
        {
          component: Text({
            content: "Email: ",
            style: { fg: colors.fg.gray },
          }),
          width: 8,
        },
        {
          component: TextInput({
            value: emailValue,
            cursorPos: emailCursor,
            focused: sections[0].expanded && focusedSection === 0,
            style: { fg: colors.fg.white },
          }),
          flex: 1,
        },
      ]),
      height: 1,
    },
    {
      component: Text({
        content: "Role:  Admin",
        style: { fg: colors.fg.gray },
      }),
      height: 1,
    },
  ]);
}

function statsContent() {
  return Column([
    {
      component: Row([
        {
          component: Text({ content: "CPU ", style: { fg: colors.fg.cyan } }),
          width: 5,
        },
        {
          component: Progress({
            value: 67,
            filledColor: colors.fg.cyan,
            emptyColor: colors.fg.gray,
          }),
          flex: 1,
        },
        {
          component: Text({ content: " 67%", style: { fg: colors.fg.gray } }),
          width: 5,
        },
      ]),
      height: 1,
    },
    {
      component: Row([
        {
          component: Text({ content: "Mem ", style: { fg: colors.fg.green } }),
          width: 5,
        },
        {
          component: Progress({
            value: 42,
            filledColor: colors.fg.green,
            emptyColor: colors.fg.gray,
          }),
          flex: 1,
        },
        {
          component: Text({ content: " 42%", style: { fg: colors.fg.gray } }),
          width: 5,
        },
      ]),
      height: 1,
    },
    {
      component: Row([
        {
          component: Text({ content: "Disk", style: { fg: colors.fg.yellow } }),
          width: 5,
        },
        {
          component: Progress({
            value: 89,
            filledColor: colors.fg.yellow,
            emptyColor: colors.fg.gray,
          }),
          flex: 1,
        },
        {
          component: Text({ content: " 89%", style: { fg: colors.fg.gray } }),
          width: 5,
        },
      ]),
      height: 1,
    },
  ]);
}

function settingsContent() {
  return Table({
    headers: ["Setting", "Value"],
    rows: [
      ["Theme", "Dark"],
      ["Language", "English"],
      ["Notifications", "On"],
      ["Auto-save", "Every 5 min"],
      ["Timezone", "UTC-5"],
    ],
    headerStyle: { fg: colors.fg.gray, bold: true },
    border: true,
  });
}

function logsContent() {
  return List({
    items: [
      "14:32:01  User login successful",
      "14:31:45  Config updated: theme=dark",
      "14:30:12  Backup completed (2.3GB)",
      "14:28:55  API rate limit warning",
      "14:25:00  Cron job: cleanup finished",
      "14:20:33  New deployment v2.4.1",
    ],
    itemStyle: { fg: colors.fg.gray },
    bullet: "·",
  });
}

const contentFns = [profileContent, statsContent, settingsContent, logsContent];

await run({
  io: denoTerminalIO(),
  render: () => {
    const sectionComponents = sections.map((section, i) => {
      const isFocused = focusedSection === i;
      return {
        component: Collapsible({
          header: section.label,
          expanded: section.expanded,
          headerStyle: {
            fg: isFocused ? colors.fg.cyan : colors.fg.white,
            bold: isFocused,
          },
          child: contentFns[i](),
        }),
        height: section.expanded ? (i === 2 ? 9 : i === 3 ? 7 : 4) : 1,
      };
    });

    return Box({
      border: "rounded",
      borderColor: colors.fg.cyan,
      title: " Collapsible Demo ",
      titleAlign: "center",
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      child: Column([
        ...sectionComponents.flatMap((s, i) => [
          s,
          ...(i < sectionComponents.length - 1
            ? [{
              component: Divider({ style: { fg: colors.fg.gray } }),
              height: 1,
            }]
            : []),
        ]),
        {
          component: Text({
            content: "↑/↓ navigate  Space toggle  q quit",
            style: { fg: colors.fg.gray },
            align: "center",
          }),
          height: 2,
        },
      ]),
    });
  },

  onKey: (event, ctrl) => {
    if (isKey(event, "q") || isKey(event, "c", { ctrl: true })) {
      ctrl.exit();
      return;
    }

    if (event.key === "Up") {
      focusedSection = (focusedSection - 1 + sections.length) % sections.length;
      return;
    }
    if (event.key === "Down") {
      focusedSection = (focusedSection + 1) % sections.length;
      return;
    }

    // Toggle the focused section
    const section = sections[focusedSection];
    const collapsible = Collapsible({
      header: section.label,
      expanded: section.expanded,
      child: Text(""),
    });
    const update = collapsible.handleKey(event);
    if (update) {
      section.expanded = update.expanded;
    }
  },
});
