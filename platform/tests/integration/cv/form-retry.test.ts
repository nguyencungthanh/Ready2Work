import path from "node:path";
import { expect, test } from "vitest";

// Isolated browser check: actual CVForm/React actions, synthetic action, no
// authentication, external provider calls or account/storage writes.
test.skipIf(process.env.R2W_RUN_CV_UI !== "1")("retains the selected PDF, pasted text and consent after failed actions", async () => {
  const { createServer } = await import("vite");
  const { default: react } = await import("@vitejs/plugin-react");
  const { chromium } = await import("@playwright/test");
  const server = await createServer({
    configFile: false, root: process.cwd(), logLevel: "error", appType: "custom",
    resolve: { alias: { "./actions": "virtual:cv-action", "@": process.cwd() } },
    optimizeDeps: { noDiscovery: true, include: ["react", "react-dom/client", "react/jsx-dev-runtime"] },
    server: { host: "127.0.0.1", port: 0 },
    plugins: [react(), {
      name: "synthetic-cv-form-action",
      enforce: "pre",
      resolveId(source) {
        if (source === "virtual:cv-action") return "\0synthetic-cv-action";
        if (source === "/cv-test-entry.js") return "\0cv-test-entry";
      },
      load(id) {
        if (id === "\0synthetic-cv-action") return `
          export async function analyzeCVAction(previous, data) {
            const file = data.get("cv");
            window.cvAttempts.push({name:file?.name, content:file ? await file.text() : null, text:data.get("cvText"), consent:data.get("consent")});
            await new Promise(resolve => setTimeout(resolve, 50));
            return {error:"Synthetic temporary analysis failure"};
          }`;
        if (id === "\0cv-test-entry") return `
          import React from "react";
          import { createRoot } from "react-dom/client";
          import { CVForm } from ${JSON.stringify(path.join(process.cwd(), "app/roadmap/cv/cv-form.tsx"))};
          window.cvAttempts=[];
          createRoot(document.getElementById("root")).render(React.createElement(CVForm,{positions:[{id:"IT-01",title:"Business Analyst",industry:"Công nghệ thông tin"}]}));`;
      },
    }],
  });
  server.middlewares.use(async (request, response, next) => {
    if (request.url !== "/") return next();
    response.setHeader("Content-Type", "text/html");
    response.end(await server.transformIndexHtml("/", '<div id="root"></div><script type="module" src="/cv-test-entry.js"></script>'));
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await server.listen();
    browser = await chromium.launch();
    const page = await browser.newPage();
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    const url = server.resolvedUrls!.local[0]!;
    await page.goto(url);
    const syntheticPdf = "%PDF-1.7 synthetic UI fixture";
    await page.getByLabel("Tải CV", { exact: true }).setInputFiles({ name: "retry.pdf", mimeType: "application/pdf", buffer: Buffer.from(syntheticPdf) });
    await page.getByRole("checkbox").check();
    const submit = page.getByRole("button", { name: "Phân tích & Tiếp tục →" });
    await submit.click();
    await page.getByRole("alert").waitFor();
    expect(await page.getByRole("checkbox").isChecked()).toBe(true);
    await submit.click();
    await page.waitForFunction(() => (window as unknown as { cvAttempts: unknown[] }).cvAttempts.length === 2);
    const attempts = await page.evaluate(() => (window as unknown as { cvAttempts: unknown[] }).cvAttempts);
    expect(attempts).toEqual(Array(2).fill({ name: "retry.pdf", content: syntheticPdf, text: "", consent: "on" }));

    await page.getByRole("button", { name: "Bỏ tệp đã chọn", exact: true }).click();
    expect(await page.getByLabel("Tải CV", { exact: true }).inputValue()).toBe("");
    await page.getByText("Hoặc dán nội dung CV", { exact: true }).click();
    const text = "Synthetic candidate with SQL and Excel experience in business analysis.";
    await page.getByLabel("Nội dung CV", { exact: true }).fill(text);
    await page.getByRole("checkbox").check();
    await submit.click();
    await page.getByRole("alert").waitFor();
    expect(await page.getByLabel("Nội dung CV", { exact: true }).inputValue()).toBe(text);
    await submit.click();
    await page.waitForFunction(() => (window as unknown as { cvAttempts: unknown[] }).cvAttempts.length === 4);
    expect(await page.evaluate(() => (window as unknown as { cvAttempts: unknown[] }).cvAttempts.slice(2))).toEqual(Array(2).fill({ content: null, text, consent: "on" }));
    expect(failures).toEqual([]);
  } finally {
    await browser?.close();
    await server.close();
  }
}, 30_000);
