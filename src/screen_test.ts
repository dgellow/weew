import { assertEquals } from "@std/assert";
import { Text } from "./components.ts";
import { Column } from "./layout.ts";
import { Screen, TestScreenIO } from "./screen.ts";
import type { ScreenEvent } from "./screen.ts";

Deno.test("Screen.draw renders component to canvas", () => {
  const io = new TestScreenIO(20, 5);
  const screen = new Screen({ io });

  screen.draw(() => Text("Hello Screen"));
  assertEquals(screen.canvas.toString().includes("Hello Screen"), true);
  screen.close();
});

Deno.test("Screen.draw passes RenderContext with dimensions", () => {
  const io = new TestScreenIO(40, 10);
  const screen = new Screen({ io });

  screen.draw(({ width, height }) => Text(`${width}x${height}`));
  assertEquals(screen.canvas.toString().includes("40x10"), true);
  screen.close();
});

Deno.test("Screen.draw clears canvas between draws", () => {
  const io = new TestScreenIO(20, 5);
  const screen = new Screen({ io });

  screen.draw(() => Text("First"));
  assertEquals(screen.canvas.toString().includes("First"), true);

  screen.draw(() => Text("Second"));
  assertEquals(screen.canvas.toString().includes("Second"), true);
  assertEquals(screen.canvas.toString().includes("First"), false);
  screen.close();
});

Deno.test("Screen.width and Screen.height match IO size", () => {
  const io = new TestScreenIO(60, 20);
  const screen = new Screen({ io });

  assertEquals(screen.width, 60);
  assertEquals(screen.height, 20);
  screen.close();
});

Deno.test("Screen.events yields key events", async () => {
  const io = new TestScreenIO(20, 5);
  const screen = new Screen({ io });
  const received: ScreenEvent[] = [];

  io.pushKey("a");
  io.pushKey("b");
  io.close();

  for await (const event of screen.events()) {
    received.push(event);
  }

  assertEquals(received.length, 2);
  assertEquals(received[0].type, "key");
  if (received[0].type === "key") {
    assertEquals(received[0].key, "a");
  }
  if (received[1].type === "key") {
    assertEquals(received[1].key, "b");
  }
  screen.close();
});

Deno.test("Screen.events yields resize events", async () => {
  const io = new TestScreenIO(80, 24);
  const screen = new Screen({ io });
  const received: ScreenEvent[] = [];

  io.pushResize(40, 12);
  io.close();

  for await (const event of screen.events()) {
    received.push(event);
  }

  assertEquals(received.length, 1);
  assertEquals(received[0].type, "resize");
  if (received[0].type === "resize") {
    assertEquals(received[0].columns, 40);
    assertEquals(received[0].rows, 12);
  }
  screen.close();
});

Deno.test("Screen.events resize updates canvas size", async () => {
  const io = new TestScreenIO(80, 24);
  const screen = new Screen({ io });

  assertEquals(screen.width, 80);
  assertEquals(screen.height, 24);

  io.pushResize(40, 12);
  io.close();

  for await (const _event of screen.events()) {
    // consume
  }

  assertEquals(screen.width, 40);
  assertEquals(screen.height, 12);
  screen.close();
});

Deno.test("Screen.events interleaves key and resize events", async () => {
  const io = new TestScreenIO(80, 24);
  const screen = new Screen({ io });
  const types: string[] = [];

  io.pushKey("a");
  io.pushResize(40, 12);
  io.pushKey("b");
  io.close();

  for await (const event of screen.events()) {
    types.push(event.type);
  }

  assertEquals(types, ["key", "resize", "key"]);
  screen.close();
});

Deno.test("Screen.close is idempotent", () => {
  const io = new TestScreenIO(20, 5);
  const screen = new Screen({ io });

  screen.close();
  screen.close(); // should not throw
});

Deno.test("Screen[Symbol.dispose] calls close", () => {
  const io = new TestScreenIO(20, 5);
  {
    using screen = new Screen({ io });
    screen.draw(() => Text("disposed"));
  }
  // If we get here, dispose didn't throw
});

Deno.test("Screen.draw with Column layout", () => {
  const io = new TestScreenIO(20, 5);
  const screen = new Screen({ io });

  screen.draw(() =>
    Column([
      { component: Text("Line 1"), height: 1 },
      { component: Text("Line 2"), height: 1 },
    ])
  );

  const text = screen.canvas.toString();
  assertEquals(text.includes("Line 1"), true);
  assertEquals(text.includes("Line 2"), true);
  screen.close();
});

Deno.test("ScreenEvent type narrowing works for key events", () => {
  const event: ScreenEvent = {
    type: "key",
    key: "q",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    raw: new Uint8Array(),
  };

  if (event.type === "key") {
    assertEquals(event.key, "q");
    assertEquals(event.ctrl, false);
  }
});

Deno.test("ScreenEvent type narrowing works for resize events", () => {
  const event: ScreenEvent = {
    type: "resize",
    columns: 120,
    rows: 40,
  };

  if (event.type === "resize") {
    assertEquals(event.columns, 120);
    assertEquals(event.rows, 40);
  }
});

Deno.test("TestScreenIO.pushKey convenience", async () => {
  const io = new TestScreenIO(20, 5);
  const screen = new Screen({ io });

  io.pushKey("x", { ctrl: true });
  io.close();

  const events: ScreenEvent[] = [];
  for await (const event of screen.events()) {
    events.push(event);
  }

  assertEquals(events.length, 1);
  if (events[0].type === "key") {
    assertEquals(events[0].key, "x");
    assertEquals(events[0].ctrl, true);
    assertEquals(events[0].alt, false);
  }
  screen.close();
});
