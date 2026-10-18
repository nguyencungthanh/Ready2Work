import path from "node:path";
import { expect, test } from "vitest";
import tasks from "@/data/task-rubrics.json";
import { publicSimulationMaterials } from "@/lib/simulation/materials";

// Actual React components with public props and a synthetic action. No account
// creation, database changes or provider calls are made by this browser check.
test.skipIf(process.env.R2W_RUN_SIM_UI !== "1")("renders refreshed source materials and persists editable answer tables", async () => {
  const { createServer } = await import("vite");
  const { default: react } = await import("@vitejs/plugin-react");
  const { chromium } = await import("@playwright/test");
  const samples = Object.fromEntries(tasks.industries.map((i) => i.tasks).flat().map((task) => [task.position_id, {
    title: task.position_name, industry: "Bài mô phỏng", brief: task.context,
    instructions: ["## Bối cảnh", task.context, "## Yêu cầu nhiệm vụ", ...task.requirements].join("\n\n"),
    minutes: task.time_limit_minutes, materials: publicSimulationMaterials(task),
    rubric: task.rubric.map((c) => ({ id: c.criterion_id, label: c.criterion_name, weight: c.max_points })),
  }]));
  const server = await createServer({
    configFile: false, root: process.cwd(), logLevel: "error", appType: "custom",
    resolve: { alias: { "../actions": "virtual:sim-action", "next/link": "virtual:next-link", "@": process.cwd() } },
    optimizeDeps: { noDiscovery: true, include: ["react", "react-dom/client", "react/jsx-dev-runtime", "react-markdown", "remark-gfm"] },
    server: { host: "127.0.0.1", port: 0 },
    plugins: [react(), {
      name: "synthetic-simulation-source", enforce: "pre",
      resolveId(source) {
        if (source.startsWith("virtual:")) return "\0" + source;
        if (source === "/simulation-entry.js") return "\0simulation-entry";
      },
      load(id) {
        if (id === "\0virtual:sim-action") return `export async function submitSimulationAction(id,previous,data){window.submitted=data.get("content");return {error:"Synthetic stop"}}; export async function readSimulationUploadAction(){return {error:"Unused"}};`;
        if (id === "\0virtual:next-link") return `import React from "react";export default function Link(props){return React.createElement("a",props)}`;
        if (id === "\0simulation-entry") return `
          import React from "react"; import {createRoot} from "react-dom/client";
          import {WaitingSimulation} from ${JSON.stringify(path.join(process.cwd(), "app/simulations/[slug]/waiting.tsx"))};
          import {SubmissionForm} from ${JSON.stringify(path.join(process.cwd(), "app/simulations/[slug]/submission-form.tsx"))};
          const id=new URLSearchParams(location.search).get("position")||"MKT-02";
          const data=${JSON.stringify(samples)}[id];
          createRoot(document.getElementById("root")).render(React.createElement(React.Fragment,null,
            React.createElement(WaitingSimulation,{...data,available:true,reason:null},React.createElement("button",null,"Bắt đầu")),
            React.createElement(SubmissionForm,{...data,simulationId:id,attemptId:"synthetic-"+id,startedAt:new Date().toISOString(),timeLimitSpecified:false})));`;
      },
    }],
  });
  server.middlewares.use(async (request, response, next) => {
    if (request.url?.split("?")[0] !== "/") return next();
    response.setHeader("Content-Type", "text/html");
    response.end(await server.transformIndexHtml("/", '<div id="root"></div><script type="module" src="/simulation-entry.js"></script>'));
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await server.listen(); browser = await chromium.launch();
    const page = await browser.newPage();
    const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
    const base = server.resolvedUrls!.local[0]!;
    await page.goto(base);
    await page.getByRole("button", { name: "Tài liệu tham khảo", exact: true }).click();
    expect(await page.locator(".waiting-body table").count()).toBe(4);
    expect(await page.locator(".waiting-body").innerText()).toContain("62500");
    expect(await page.locator(".waiting-body").innerText()).toContain("Dữ liệu mô phỏng");
    const budget = page.getByLabel("Bảng kế hoạch ngân sách, hàng 1, Ngân sách (đồng)", { exact: true });
    await budget.fill("3000000");
    await page.getByRole("textbox", { name: "Nội dung bài làm", exact: true }).fill("Bài làm giả: em phân tích số liệu và đề xuất thử nghiệm.");
    await page.reload();
    expect(await budget.inputValue()).toBe("3000000");
    await page.getByRole("button", { name: "Nộp báo cáo", exact: true }).click();
    await page.waitForFunction(() => Boolean((window as unknown as {submitted?:string}).submitted));
    expect(await page.evaluate(() => (window as unknown as {submitted:string}).submitted)).toContain("3000000");
    expect(await page.evaluate(() => (window as unknown as {submitted:string}).submitted)).not.toContain("marketing-ad-data");
    await page.goto(base + "?position=MKT-03");
    await page.getByRole("button", { name: "Tài liệu tham khảo", exact: true }).click();
    const keywordSection = page.locator(".waiting-body section").filter({ has: page.getByRole("heading", { name: "Bảng 12 từ khóa SEO · Dữ liệu mô phỏng", exact: true }) });
    expect(await keywordSection.locator("tbody tr").count()).toBe(12);
    await page.goto(base + "?position=TCNH-01");
    expect(await page.locator(".waiting-body").innerText()).toContain("5 nguyên nhân");
    expect(await page.locator(".waiting-body").innerText()).toContain("5 nhận định");
    await page.getByRole("button", { name: "Tiêu chí đánh giá", exact: true }).click();
    expect(await page.locator(".waiting-body strong").allTextContents()).toEqual(["30%", "30%", "30%", "10%"]);
    expect(await page.locator(".waiting-body").innerText()).not.toContain("checklist_id");
    expect(errors).toEqual([]);
  } finally { await browser?.close(); await server.close(); }
}, 40_000);
