import { assertEquals } from "@std/assert";
import { TestDriver } from "./test_driver.ts";
import { Text } from "./components.ts";
import { Column } from "./layout.ts";

Deno.test("onKey returning new state triggers re-render", () => {
  const driver = new TestDriver(
    {
      initialState: { label: "hello" },
      render: (state) => Text(state.label),
      onKey: (_event, _state) => ({ label: "world" }),
    },
    20,
    5,
  );

  driver.sendKey("x");
  assertEquals(driver.state.label, "world");
  assertEquals(driver.findText("world"), true);
});

Deno.test("onKey returning undefined skips re-render", () => {
  let renderCount = 0;
  const driver = new TestDriver(
    {
      initialState: { count: 0 },
      render: (state) => {
        renderCount++;
        return Text(`Count: ${state.count}`);
      },
      onKey: () => undefined,
    },
    20,
    5,
  );

  const countAfterInit = renderCount;
  driver.sendKey("x");
  // State should not change
  assertEquals(driver.state.count, 0);
  // renderFrame is still called but _needsRender is false so the
  // actual render function should not be called again
  assertEquals(renderCount, countAfterInit);
});

Deno.test("ctx.setState with function updater", () => {
  const driver = new TestDriver(
    {
      initialState: { count: 5 },
      render: (state) => Text(`Count: ${state.count}`),
      onKey: (_event, _state, ctx) => {
        ctx.setState((s) => ({ count: s.count + 10 }));
        return undefined;
      },
    },
    20,
    5,
  );

  driver.sendKey("x");
  assertEquals(driver.state.count, 15);
  assertEquals(driver.findText("Count: 15"), true);
});

Deno.test("ctx.exit() stops app", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: () => Text("running"),
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

Deno.test("ctx.render() forces re-render", () => {
  let renderCount = 0;
  const driver = new TestDriver(
    {
      initialState: { value: "a" },
      render: (state) => {
        renderCount++;
        return Text(state.value);
      },
      onKey: (_event, _state, ctx) => {
        ctx.render();
        return undefined;
      },
    },
    20,
    5,
  );

  const countAfterInit = renderCount;
  driver.sendKey("x");
  // ctx.render() sets _needsRender = true, so renderFrame will re-render
  assertEquals(renderCount, countAfterInit + 1);
});

Deno.test("onTick advances state", () => {
  const driver = new TestDriver(
    {
      initialState: { elapsed: 0 },
      render: (state) => Text(`Elapsed: ${state.elapsed}`),
      onTick: (state, delta) => ({ elapsed: state.elapsed + delta }),
    },
    30,
    5,
  );

  driver.tick(100);
  assertEquals(driver.state.elapsed, 100);
  driver.tick(50);
  assertEquals(driver.state.elapsed, 150);
  assertEquals(driver.findText("Elapsed: 150"), true);
});

Deno.test("onResize handler called on resize", () => {
  const driver = new TestDriver(
    {
      initialState: { resized: false, w: 80, h: 24 },
      render: (state) => Text(`${state.w}x${state.h} resized=${state.resized}`),
      onResize: (size) => ({
        resized: true,
        w: size.columns,
        h: size.rows,
      }),
    },
    80,
    24,
  );

  assertEquals(driver.state.resized, false);
  driver.resize(40, 12);
  assertEquals(driver.state.resized, true);
  assertEquals(driver.state.w, 40);
  assertEquals(driver.state.h, 12);
});

Deno.test("correct RenderContext dimensions", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: (_state, ctx) => Text(`${ctx.width}x${ctx.height}`),
    },
    60,
    20,
  );

  assertEquals(driver.findText("60x20"), true);

  driver.resize(30, 10);
  assertEquals(driver.findText("30x10"), true);
});

Deno.test("state persistence across multiple key events", () => {
  const driver = new TestDriver(
    {
      initialState: { items: [] as string[] },
      render: (state) => Text(state.items.join(",")),
      onKey: (event, state) => ({
        items: [...state.items, event.key],
      }),
    },
    40,
    5,
  );

  driver.sendKey("a");
  driver.sendKey("b");
  driver.sendKey("c");
  assertEquals(driver.state.items, ["a", "b", "c"]);
  assertEquals(driver.findText("a,b,c"), true);
});

Deno.test("app with no optional handlers works", () => {
  const driver = new TestDriver(
    {
      initialState: { msg: "defaults" },
      render: (state) => Text(state.msg),
    },
    20,
    5,
  );

  assertEquals(driver.findText("defaults"), true);
  // sendKey should not crash with no onKey handler
  driver.sendKey("x");
  assertEquals(driver.state.msg, "defaults");
  // tick should not crash with no onTick handler
  driver.tick(16);
  assertEquals(driver.state.msg, "defaults");
});

Deno.test("sendKeys sends multiple keys in sequence", () => {
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

  driver.sendKeys("Up", "Up", "Up");
  assertEquals(driver.state.count, 3);
  assertEquals(driver.findText("Count: 3"), true);
});

Deno.test("findText returns true/false correctly", () => {
  const driver = new TestDriver(
    {
      initialState: {},
      render: () =>
        Column([
          { component: Text("Hello World"), height: 1 },
          { component: Text("Goodbye"), height: 1 },
        ]),
    },
    20,
    5,
  );

  assertEquals(driver.findText("Hello"), true);
  assertEquals(driver.findText("World"), true);
  assertEquals(driver.findText("Goodbye"), true);
  assertEquals(driver.findText("Missing"), false);
  assertEquals(driver.findText("hello"), false); // case-sensitive
});
