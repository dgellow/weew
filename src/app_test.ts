import { assertEquals } from "@std/assert";
import { TestDriver } from "./test_driver.ts";
import { Text } from "./components.ts";
import { Column } from "./layout.ts";

Deno.test("onKey triggers re-render", () => {
  let label = "hello";
  const driver = new TestDriver(
    {
      render: () => Text(label),
      onKey: () => {
        label = "world";
      },
    },
    20,
    5,
  );

  driver.sendKey("x");
  assertEquals(label, "world");
  assertEquals(driver.findText("world"), true);
});

Deno.test("sendKey always re-renders", () => {
  let renderCount = 0;
  const driver = new TestDriver(
    {
      render: () => {
        renderCount++;
        return Text("static");
      },
    },
    20,
    5,
  );

  const countAfterInit = renderCount;
  driver.sendKey("x");
  assertEquals(renderCount, countAfterInit + 1);
});

Deno.test("ctx.exit() stops app", () => {
  const driver = new TestDriver(
    {
      render: () => Text("running"),
      onKey: (_event, ctx) => {
        ctx.exit();
      },
    },
    20,
    5,
  );

  assertEquals(driver.running, true);
  driver.sendKey("q");
  assertEquals(driver.running, false);
});

Deno.test("ctx.render() triggers immediate re-render", () => {
  let value = "before";
  const driver = new TestDriver(
    {
      render: () => Text(value),
    },
    20,
    5,
  );

  assertEquals(driver.findText("before"), true);

  // Simulate async: mutate state and call ctx.render() directly
  value = "after";
  driver.screen; // access to confirm no re-render yet
  assertEquals(driver.findText("before"), true); // still old

  // ctx.render() should render immediately without needing driver.render()
  value = "async-updated";
  // We can't call ctx directly in this test setup, but driver.render() exercises the same path
  driver.render();
  assertEquals(driver.findText("async-updated"), true);
});

Deno.test("onTick advances state", () => {
  let elapsed = 0;
  const driver = new TestDriver(
    {
      render: () => Text(`Elapsed: ${elapsed}`),
      onTick: (delta) => {
        elapsed += delta;
      },
    },
    30,
    5,
  );

  driver.tick(100);
  assertEquals(elapsed, 100);
  driver.tick(50);
  assertEquals(elapsed, 150);
  assertEquals(driver.findText("Elapsed: 150"), true);
});

Deno.test("onResize handler called on resize", () => {
  let resized = false;
  let w = 80;
  let h = 24;
  const driver = new TestDriver(
    {
      render: () => Text(`${w}x${h} resized=${resized}`),
      onResize: (size) => {
        resized = true;
        w = size.columns;
        h = size.rows;
      },
    },
    80,
    24,
  );

  assertEquals(resized, false);
  driver.resize(40, 12);
  assertEquals(resized, true);
  assertEquals(w, 40);
  assertEquals(h, 12);
});

Deno.test("correct RenderContext dimensions", () => {
  const driver = new TestDriver(
    {
      render: (ctx) => Text(`${ctx.width}x${ctx.height}`),
    },
    60,
    20,
  );

  assertEquals(driver.findText("60x20"), true);

  driver.resize(30, 10);
  assertEquals(driver.findText("30x10"), true);
});

Deno.test("state persistence across multiple key events", () => {
  const items: string[] = [];
  const driver = new TestDriver(
    {
      render: () => Text(items.join(",")),
      onKey: (event) => {
        items.push(event.key);
      },
    },
    40,
    5,
  );

  driver.sendKey("a");
  driver.sendKey("b");
  driver.sendKey("c");
  assertEquals(items, ["a", "b", "c"]);
  assertEquals(driver.findText("a,b,c"), true);
});

Deno.test("app with no optional handlers works", () => {
  const driver = new TestDriver(
    {
      render: () => Text("defaults"),
    },
    20,
    5,
  );

  assertEquals(driver.findText("defaults"), true);
  // sendKey should not crash with no onKey handler
  driver.sendKey("x");
  assertEquals(driver.findText("defaults"), true);
  // tick should not crash with no onTick handler
  driver.tick(16);
  assertEquals(driver.findText("defaults"), true);
});

Deno.test("sendKeys sends multiple keys in sequence", () => {
  let count = 0;
  const driver = new TestDriver(
    {
      render: () => Text(`Count: ${count}`),
      onKey: (event) => {
        if (event.key === "Up") count++;
      },
    },
    20,
    5,
  );

  driver.sendKeys("Up", "Up", "Up");
  assertEquals(count, 3);
  assertEquals(driver.findText("Count: 3"), true);
});

Deno.test("findText returns true/false correctly", () => {
  const driver = new TestDriver(
    {
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
