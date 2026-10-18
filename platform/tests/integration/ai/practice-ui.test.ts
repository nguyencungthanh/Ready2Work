import path from "node:path";
import { expect, test } from "vitest";

// Real forms and timer, with synthetic actions and no account/provider writes.
test.skipIf(process.env.R2W_RUN_PRACTICE_UI !== "1")("locks both practice flows at one hour and exposes owner-history deletion", async () => {
  const { createServer } = await import("vite");
  const { default: react } = await import("@vitejs/plugin-react");
  const { chromium, expect: ui } = await import("@playwright/test");
  const server = await createServer({
    configFile: false, root: process.cwd(), logLevel: "error", appType: "custom",
    resolve: { alias: { "@/app/interviews/actions": "virtual:actions", "../../actions": "virtual:actions", "../actions": "virtual:actions", "next/link": "virtual:link", "next/image": "virtual:image", "@": process.cwd() } },
    optimizeDeps: { noDiscovery: true, include: ["react", "react-dom/client", "react/jsx-dev-runtime", "react-markdown", "remark-gfm"] },
    server: { host: "127.0.0.1", port: 0 },
    plugins: [react(), { name: "practice-fixture", enforce: "pre",
      resolveId(id) { if (id.startsWith("virtual:") || id === "/practice-entry.js") return "\0" + id; },
      load(id) {
        if (id === "\0virtual:link") return 'import React from "react";export default function Link(props){return React.createElement("a",props)}';
        if (id === "\0virtual:image") return 'import React from "react";export default function Image({priority,...props}){return React.createElement("img",props)}';
        if (id === "\0virtual:actions") return 'export async function submitSimulationAction(){window.submitted=true;return {}};export async function readSimulationUploadAction(){return {text:"Synthetic upload"}};export async function submitInterviewAnswerAction(){window.submitted=true;return {}};export async function deleteInterviewSessionAction(previous,data){window.deleted=data.get("sessionId");return {}};';
        if (id === "\0/practice-entry.js") return `
          import React from "react";import {createRoot} from "react-dom/client";
          import {SubmissionForm} from ${JSON.stringify(path.join(process.cwd(), "app/simulations/[slug]/submission-form.tsx"))};
          import {AnswerForm} from ${JSON.stringify(path.join(process.cwd(), "app/interviews/sessions/[sessionId]/answer-form.tsx"))};
          import {InterviewCatalog} from ${JSON.stringify(path.join(process.cwd(), "components/reference/interview-catalog.tsx"))};
          const params=new URLSearchParams(location.search);const startedAt=params.get("start");const view=params.get("view");
          const activity=[{id:"session-to-delete",set_id:"set",created_at:startedAt,completed_at:null,overall_score:null,round_scores:null}];
          const component=view==="interview"?React.createElement(AnswerForm,{sessionId:"session",questionId:"question",prompt:"Câu hỏi giả",round:1,index:0,total:3,startedAt}):view==="history"?React.createElement(InterviewCatalog,{items:[],activity}):React.createElement(SubmissionForm,{simulationId:"simulation",attemptId:"attempt",startedAt,minutes:30,title:"Đề giả",industry:"IT",instructions:"Đề giả",timeLimitSpecified:false});
          createRoot(document.getElementById("root")).render(component);`;
      },
    }],
  });
  server.middlewares.use(async (request, response, next) => {
    if (request.url?.split("?")[0] !== "/") return next();
    response.setHeader("Content-Type", "text/html");
    response.end(await server.transformIndexHtml("/", '<div id="root"></div><script type="module" src="/practice-entry.js"></script>'));
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await server.listen(); browser = await chromium.launch(); const page = await browser.newPage();
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript('window.SpeechRecognition=class{start(){}stop(){window.micStopped=(window.micStopped||0)+1}};');
    const now = new Date("2026-10-19T04:00:00Z");
    const start = new Date(now.getTime()-3_598_000).toISOString();
    await page.clock.install({ time: now });
    const url = server.resolvedUrls!.local[0]! + "?start=" + encodeURIComponent(start);
    await page.goto(url);
    const editor = page.getByRole("textbox", { name: "Nội dung bài làm" });
    await editor.fill("Bản nháp giữ lại khi hết giờ.");
    await ui(page.getByRole("button", { name: "Nộp báo cáo" })).toBeEnabled();
    await page.clock.fastForward(3000);
    await ui(page.getByRole("alert")).toContainText("Đã hết 60 phút");
    await ui(editor).toHaveAttribute("contenteditable", "false");
    await ui(page.getByRole("button", { name: "Đã hết giờ" })).toBeDisabled();
    await ui(page.getByRole("button", { name: "Tải tài liệu bài làm" })).toBeDisabled();
    await ui(page.getByLabel("Thời gian còn lại")).toContainText("00:00:00");
    await page.clock.fastForward(60_000); await page.reload();
    await ui(editor).toContainText("Bản nháp giữ lại");
    await ui(page.getByLabel("Thời gian còn lại")).toContainText("00:00:00");
    await page.clock.setSystemTime(now); await page.goto(url + "&view=interview");
    await page.getByRole("textbox", { name: "Câu trả lời", exact: true }).fill("Câu trả lời giữ lại.");
    await page.getByRole("tab", { name: "Trả lời bằng Giọng nói" }).click();
    await page.getByRole("button", { name: "Bắt đầu nhận giọng nói" }).click();
    await page.clock.fastForward(3000);
    await ui(page.getByRole("alert")).toContainText("Đã hết 60 phút");
    await ui(page.getByRole("button", { name: "Đã hết giờ" })).toBeDisabled();
    await ui(page.getByRole("button", { name: "Dừng nhận giọng nói" })).toBeDisabled();
    expect(await page.evaluate(() => (window as unknown as {micStopped:number}).micStopped)).toBeGreaterThan(0);
    await page.goto(url + "&view=history");
    await ui(page.getByRole("link", { name: "Xem chi tiết →", exact: true })).toHaveCount(0);
    await ui(page.getByText(/Đã hết giờ/)).toBeVisible();
    await page.evaluate(() => sessionStorage.setItem("r2w:answer:session-to-delete:question", "Synthetic local draft"));
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Xóa buổi phỏng vấn" }).click();
    await page.waitForFunction(() => (window as unknown as {deleted?:string}).deleted === "session-to-delete");
    await page.waitForFunction(() => sessionStorage.getItem("r2w:answer:session-to-delete:question") === null);
    expect(errors).toEqual([]);
  } finally { await browser?.close(); await server.close(); }
}, 40_000);
