#!/usr/bin/env -S deno run -A
import { denoTerminalIO } from "../../mod.ts";
import { musicApp } from "./app.ts";

await musicApp(denoTerminalIO());
