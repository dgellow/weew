// Interactive form demo with TextInput, focus, and scroll
import {
  Box,
  colors,
  Column,
  Row,
  run,
  ScrollBox,
  Text,
  TextInput,
} from "../mod.ts";

interface FormField {
  id: string;
  label: string;
  value: string;
  cursorPos: number;
}

interface State {
  fields: FormField[];
  focusedIndex: number;
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
    focusedIndex: 0,
    scrollY: 0,
    messages: [
      "Welcome to weew forms!",
      "Use Tab/↑↓ to navigate",
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
            state.fields.map((field, i) => ({
              component: Column([
                {
                  component: Row([
                    {
                      component: Text({
                        content: field.label + ":",
                        style: {
                          fg: i === state.focusedIndex
                            ? colors.fg.cyan
                            : colors.fg.white,
                          bold: i === state.focusedIndex,
                        },
                      }),
                      width: 12,
                    },
                    {
                      flex: 1,
                      component: Box({
                        border: i === state.focusedIndex ? "single" : "none",
                        borderColor: colors.fg.cyan,
                        child: TextInput({
                          value: field.id === "password"
                            ? "•".repeat(field.value.length)
                            : field.value,
                          cursorPos: field.cursorPos,
                          placeholder: `Enter ${field.label.toLowerCase()}...`,
                          focused: i === state.focusedIndex,
                          style: { fg: colors.fg.white },
                        }),
                      }),
                    },
                  ]),
                },
                { component: Text(""), height: 1 },
              ]),
            })),
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
    const field = state.fields[state.focusedIndex];

    // Navigation
    if (event.key === "Tab" || event.key === "Down") {
      return {
        ...state,
        focusedIndex: (state.focusedIndex + 1) % state.fields.length,
      };
    }

    if (event.key === "Up" || (event.key === "Tab" && event.shift)) {
      return {
        ...state,
        focusedIndex: (state.focusedIndex - 1 + state.fields.length) %
          state.fields.length,
      };
    }

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
        fields: state.fields.map((f, i) =>
          i === state.focusedIndex ? { ...f, value: "", cursorPos: 0 } : f
        ),
      };
    }

    // Text input
    if (event.key === "Backspace") {
      if (field.cursorPos > 0) {
        const newValue = field.value.slice(0, field.cursorPos - 1) +
          field.value.slice(field.cursorPos);
        return {
          ...state,
          fields: state.fields.map((f, i) =>
            i === state.focusedIndex
              ? { ...f, value: newValue, cursorPos: field.cursorPos - 1 }
              : f
          ),
        };
      }
      return state;
    }

    if (event.key === "Left") {
      return {
        ...state,
        fields: state.fields.map((f, i) =>
          i === state.focusedIndex
            ? { ...f, cursorPos: Math.max(0, f.cursorPos - 1) }
            : f
        ),
      };
    }

    if (event.key === "Right") {
      return {
        ...state,
        fields: state.fields.map((f, i) =>
          i === state.focusedIndex
            ? { ...f, cursorPos: Math.min(f.value.length, f.cursorPos + 1) }
            : f
        ),
      };
    }

    // Type character
    if (event.key.length === 1 && !event.ctrl && !event.alt) {
      const newValue = field.value.slice(0, field.cursorPos) +
        event.key +
        field.value.slice(field.cursorPos);
      return {
        ...state,
        fields: state.fields.map((f, i) =>
          i === state.focusedIndex
            ? { ...f, value: newValue, cursorPos: field.cursorPos + 1 }
            : f
        ),
      };
    }

    return state;
  },
});
