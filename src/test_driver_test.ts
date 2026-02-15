import { assertEquals } from "@std/assert";
import { TestDriver } from "./test_driver.ts";
import { Box, Text } from "./components.ts";
import { Column } from "./layout.ts";
import { assertRegion, assertTextAt } from "./test_helpers.ts";

Deno.test("TestDriver renders initial state", () => {
  const driver = new TestDriver(
    {
      initialState: { count: 0 },
      render: (state) => Text(`Count: ${state.count}`),
    },
    20,
    5,
  );

  assertTextAt(driver.screen, 0, 0, "Count: 0");
});

Deno.test("TestDriver.sendKey updates state", () => {
  const driver = new TestDriver(
    {
      initialState: { count: 0 },
      render: (state) => Text(`Count: ${state.count}`),
      onKey: (event, state) => {
        if (event.key === "Up") return { count: state.count + 1 };
        if (event.key === "Down") return { count: state.count - 1 };
        return undefined;
      },
    },
    20,
    5,
  );

  driver.sendKey("Up");
  assertEquals(driver.state.count, 1);
  assertTextAt(driver.screen, 0, 0, "Count: 1");

  driver.sendKey("Up");
  driver.sendKey("Up");
  assertEquals(driver.state.count, 3);
  assertTextAt(driver.screen, 0, 0, "Count: 3");

  driver.sendKey("Down");
  assertEquals(driver.state.count, 2);
});

Deno.test("TestDriver.tick advances state", () => {
  const driver = new TestDriver(
    {
      initialState: { frame: 0 },
      render: (state) => Text(`Frame: ${state.frame}`),
      onTick: (state, _delta) => ({ frame: state.frame + 1 }),
    },
    20,
    5,
  );

  driver.tick(16);
  assertEquals(driver.state.frame, 1);

  driver.tick(16);
  driver.tick(16);
  assertEquals(driver.state.frame, 3);
});

Deno.test("TestDriver.resize updates dimensions", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: (_state, ctx) => Text(`${ctx.width}x${ctx.height}`),
    },
    80,
    24,
  );

  assertTextAt(driver.screen, 0, 0, "80x24");

  driver.resize(40, 12);
  assertTextAt(driver.screen, 0, 0, "40x12");
});

Deno.test("TestDriver.exit stops the app", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: () => Text(""),
      onKey: (_event, _state, ctx) => {
        ctx.exit();
        return undefined;
      },
    },
    20,
    5,
  );

  assertEquals(driver.running, true);
  driver.sendKey("q");
  assertEquals(driver.running, false);
});

Deno.test("TestDriver renders complex layouts", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: () =>
        Box({
          border: "single",
          child: Text("Hello"),
        }),
    },
    10,
    3,
  );

  assertRegion(driver.screen, 0, 0, [
    "┌────────┐",
    "│Hello   │",
    "└────────┘",
  ]);
});

Deno.test("TestDriver.text returns full screen text", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: () =>
        Column([
          { component: Text("Line 1"), height: 1 },
          { component: Text("Line 2"), height: 1 },
        ]),
    },
    10,
    3,
  );

  const text = driver.text;
  const lines = text.split("\n");
  assertEquals(lines[0].trimEnd(), "Line 1");
  assertEquals(lines[1].trimEnd(), "Line 2");
});

Deno.test("TestDriver.setState from handler triggers re-render", () => {
  const driver = new TestDriver(
    {
      initialState: { msg: "before" },
      render: (state) => Text(state.msg),
      onKey: (_event, _state, ctx) => {
        ctx.setState({ msg: "after" });
        return undefined;
      },
    },
    20,
    5,
  );

  assertTextAt(driver.screen, 0, 0, "before");
  driver.sendKey("x");
  assertTextAt(driver.screen, 0, 0, "after");
});

Deno.test("TestDriver.sendKeys sends multiple keys in sequence", () => {
  const driver = new TestDriver(
    {
      initialState: { count: 0 },
      render: (state) => Text(`Count: ${state.count}`),
      onKey: (event, state) => {
        if (event.key === "Up") return { count: state.count + 1 };
        return undefined;
      },
    },
    20,
    5,
  );

  driver.sendKeys("Up", "Up", "Up", "Up", "Up");
  assertEquals(driver.state.count, 5);
  assertTextAt(driver.screen, 0, 0, "Count: 5");
});

Deno.test("TestDriver.findText returns true when text is on screen", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: () => Text("Hello World"),
    },
    20,
    5,
  );

  assertEquals(driver.findText("Hello"), true);
  assertEquals(driver.findText("World"), true);
  assertEquals(driver.findText("Hello World"), true);
});

Deno.test("TestDriver.findText returns false when text is absent", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: () => Text("Hello World"),
    },
    20,
    5,
  );

  assertEquals(driver.findText("Goodbye"), false);
  assertEquals(driver.findText("hello"), false); // case-sensitive
  assertEquals(driver.findText("xyz"), false);
});

Deno.test("TestDriver.sendKeys processes each key through onKey", () => {
  const keysReceived: string[] = [];
  const driver = new TestDriver(
    {
      initialState: { log: "" },
      render: (state) => Text(state.log),
      onKey: (event, state) => {
        keysReceived.push(event.key);
        return { log: state.log + event.key };
      },
    },
    30,
    5,
  );

  driver.sendKeys("a", "b", "c");
  assertEquals(keysReceived, ["a", "b", "c"]);
  assertEquals(driver.state.log, "abc");
});

Deno.test("TestDriver.findText with text spanning part of screen", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: () =>
        Column([
          { component: Text("First line here"), height: 1 },
          { component: Text("Second line here"), height: 1 },
          { component: Text("Third line here"), height: 1 },
        ]),
    },
    20,
    5,
  );

  assertEquals(driver.findText("First"), true);
  assertEquals(driver.findText("Second"), true);
  assertEquals(driver.findText("Third"), true);
  assertEquals(driver.findText("line here"), true);
  assertEquals(driver.findText("Fourth"), false);
});
