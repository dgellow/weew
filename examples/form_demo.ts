// Interactive form demo with TextInput, focus, and scroll
import {
  Box,
  colors,
  Column,
  handleFocusGroup,
  Row,
  run,
  ScrollBox,
  Text,
  TextInput,
} from "../mod.ts";
import type { TextInputUpdate } from "../mod.ts";

interface FormField {
  id: string;
  label: string;
  value: string;
  cursorPos: number;
}

interface State {
  fields: FormField[];
  focusedId: string;
  scrollY: number;
  messages: string[];
}

const initialFields: FormField[] = [
  { id: "name", label: "Name", value: "", cursorPos: 0 },
  { id: "email", label: "Email", value: "", cursorPos: 0 },
  { id: "password", label: "Password", value: "", cursorPos: 0 },
  { id: "bio", label: "Bio", value: "", cursorPos: 0 },
];

await run<State>({
  initialState: {
    fields: initialFields,
    focusedId: "name",
    scrollY: 0,
    messages: [
      "Welcome to weew forms!",
      "Use Tab/Shift+Tab to navigate",
      "Type to enter text",
      "Enter to submit",
      "Escape to clear",
      "Ctrl+Q to quit",
    ],
  },

  render: (state) =>
    Row([
      // Left panel - Form
      {
        flex: 1,
        component: Box({
          border: "rounded",
          borderColor: colors.fg.cyan,
          title: " Registration Form ",
          padding: 1,
          child: Column(
            state.fields.map((field) => {
              const isFocused = field.id === state.focusedId;
              return {
                component: Column([
                  {
                    component: Row([
                      {
                        component: Text({
                          content: field.label + ":",
                          style: {
                            fg: isFocused ? colors.fg.cyan : colors.fg.white,
                            bold: isFocused,
                          },
                        }),
                        width: 12,
                      },
                      {
                        flex: 1,
                        component: Box({
                          border: isFocused ? "single" : "none",
                          borderColor: colors.fg.cyan,
                          child: TextInput({
                            value: field.id === "password"
                              ? "\u2022".repeat(field.value.length)
                              : field.value,
                            cursorPos: field.cursorPos,
                            placeholder:
                              `Enter ${field.label.toLowerCase()}...`,
                            focused: isFocused,
                            style: { fg: colors.fg.white },
                          }),
                        }),
                      },
                    ]),
                  },
                  { component: Text(""), height: 1 },
                ]),
              };
            }),
          ),
        }),
      },

      // Right panel - Messages/Log
      {
        width: 30,
        component: Box({
          border: "rounded",
          borderColor: colors.fg.green,
          title: " Messages ",
          child: ScrollBox({
            scrollY: state.scrollY,
            contentHeight: state.messages.length,
            borderColor: colors.fg.gray,
            showScrollbar: true,
            border: "none",
            child: Column(
              state.messages.map((msg, i) => ({
                component: Text({
                  content: msg,
                  style: {
                    fg: i === 0 ? colors.fg.green : colors.fg.gray,
                  },
                }),
              })),
            ),
          }),
        }),
      },
    ]),

  onKey: (event, state, ctx) => {
    // Quit
    if (event.key === "q" && event.ctrl) {
      ctx.exit();
      return;
    }

    // Submit
    if (event.key === "Enter") {
      const filledFields = state.fields.filter((f) => f.value);
      if (filledFields.length > 0) {
        return {
          ...state,
          messages: [
            `Submitted: ${filledFields.map((f) => f.label).join(", ")}`,
            ...state.messages,
          ],
          scrollY: 0,
        };
      }
      return state;
    }

    // Clear field
    if (event.key === "Escape") {
      return {
        ...state,
        fields: state.fields.map((f) =>
          f.id === state.focusedId ? { ...f, value: "", cursorPos: 0 } : f
        ),
      };
    }

    // Focus group handles Tab navigation + text input
    const result = handleFocusGroup(
      {
        items: state.fields.map((field) => ({
          id: field.id,
          input: TextInput({
            value: field.value,
            cursorPos: field.cursorPos,
          }),
          apply: (s: State, update: unknown) => {
            const u = update as TextInputUpdate;
            return {
              ...s,
              fields: s.fields.map((f) =>
                f.id === field.id
                  ? { ...f, value: u.value, cursorPos: u.cursorPos }
                  : f
              ),
            };
          },
        })),
        focusedId: state.focusedId,
      },
      event,
      state,
    );
    if (result.handled) {
      return {
        ...(result.state ?? state),
        focusedId: result.focusedId,
      };
    }

    return state;
  },
});
