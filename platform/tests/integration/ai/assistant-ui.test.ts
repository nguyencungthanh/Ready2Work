import path from "node:path";
import { expect, test } from "vitest";

test.skipIf(process.env.R2W_RUN_ASSISTANT_UI !== "1")("shows partial text before completion and recovers an interrupted answer", async () => {
  const { createServer } = await import("vite");
  const { default: react } = await import("@vitejs/plugin-react");
  const { chromium, expect: browserExpect } = await import("@playwright/test");
  const server = await createServer({
    configFile: false, root: process.cwd(), logLevel: "error", appType: "custom",
    resolve: { alias: { "next/link": "virtual:link", "@": process.cwd() } },
    optimizeDeps: { noDiscovery: true, include: ["react", "react-dom/client", "react/jsx-dev-runtime", "react-markdown"] },
    server: { host: "127.0.0.1", port: 0 },
    plugins: [react(), { name: "assistant-fixture", enforce: "pre",
      resolveId(id) { if (id === "virtual:link" || id === "/assistant-entry.js") return "\0" + id; },
      load(id) {
        if (id === "\0virtual:link") return 'import React from "react";export default function Link(props){return React.createElement("a",props)}';
        if (id === "\0/assistant-entry.js") return `import React from "react";import {createRoot} from "react-dom/client";import {DashboardAssistant} from ${JSON.stringify(path.join(process.cwd(), "components/reference/dashboard-assistant.tsx"))};createRoot(document.getElementById("root")).render(React.createElement(DashboardAssistant,{name:"Kiểm thử"}));`;
      },
    }],
  });
  server.middlewares.use(async (request, response, next) => {
    if (request.url !== "/") return next();
    response.setHeader("Content-Type", "text/html");
    response.end(await server.transformIndexHtml("/", '<div id="root"></div><script type="module" src="/assistant-entry.js"></script>'));
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await server.listen(); browser = await chromium.launch();
    const page = await browser.newPage();
    const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const original = window.fetch;
      const fixture = window as unknown as { requests: { messages: unknown[] }[]; emit: (event: object) => void };
      fixture.requests = [];
      window.fetch = async (input, init) => {
        if (input !== "/api/assistant") return original(input, init);
        fixture.requests.push(JSON.parse(String(init?.body)));
        return new Response(new ReadableStream<Uint8Array>({ start(controller) {
          fixture.emit = (event) => { controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n")); if ("done" in event || "error" in event) controller.close(); };
        } }), { headers: { "Content-Type": "application/x-ndjson" } });
      };
    });
    await page.goto(server.resolvedUrls!.local[0]!);
    const input = page.getByRole("textbox", { name: "Tin nhắn cho R2W AI" });
    const log = page.getByRole("log");
    const emit = (event: object) => page.evaluate((event) => (window as unknown as {emit:(e:object)=>void}).emit(event), event);
    await input.fill("Câu hỏi đầu"); await input.press("Enter");
    await page.waitForFunction(() => Boolean((window as unknown as {emit?:unknown}).emit));
    await emit({ delta: "Nội dung đang viết" });
    await browserExpect(log).toContainText("Nội dung đang viết");
    await browserExpect(input).toBeDisabled();
    await emit({ delta: " **hoàn tất**" }); await emit({ done: true });
    await browserExpect(input).toHaveValue("");
    await browserExpect(log.locator("strong")).toHaveText("hoàn tất");
    await input.fill("Câu hỏi tiếp"); await input.press("Enter");
    await page.waitForFunction(() => (window as unknown as {requests:unknown[]}).requests.length === 2);
    await emit({ delta: "Phản hồi dở" }); await browserExpect(log).toContainText("Phản hồi dở");
    await emit({ error: "Synthetic failure" });
    await browserExpect(page.getByRole("alert")).toBeVisible();
    await browserExpect(log).not.toContainText("Phản hồi dở");
    await browserExpect(input).toHaveValue("Câu hỏi tiếp");
    await page.getByRole("button", { name: "Thử gửi lại" }).click();
    await page.waitForFunction(() => (window as unknown as {requests:unknown[]}).requests.length === 3);
    const requests = await page.evaluate(() => (window as unknown as {requests:unknown[]}).requests);
    expect(requests[2]).toEqual(requests[1]);
    await emit({ delta: "Đã thử lại" }); await emit({ done: true });
    await browserExpect(input).toHaveValue(""); expect(errors).toEqual([]);
  } finally { await browser?.close(); await server.close(); }
}, 40_000);
