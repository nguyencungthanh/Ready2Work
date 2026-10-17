import {expect,test,type Page} from "@playwright/test";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import {readFile} from "node:fs/promises";
import {extractText,getDocumentProxy} from "unpdf";
import interviewSource from "../../data/interview-bank.json";

// Render fixtures are restricted to the isolated local stack and removed afterwards.
// These scores are test data, not a claim that live AI scoring was executed.
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
const local=/^http:\/\/(localhost|127\.0\.0\.1):54321\/?$/.test(url);
const secret=process.env.SUPABASE_SECRET_KEY;
const password="Ready2Work-UI-Fixture-2026";
let admin:SupabaseClient;
let userId="",email="",simId="",simSlug="",submissionId="",interviewId="",interviewSlug="",completedSession="";
async function capture(page:Page,name:string){
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})));document.documentElement.style.scrollBehavior="auto";scrollTo({top:0,left:0,behavior:"instant"});document.querySelector(".business-editor-body")?.scrollTo({top:0,behavior:"instant"});await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))});
 await page.screenshot({path:test.info().outputPath(name),fullPage:await page.getByRole("dialog").count()===0,animations:"disabled",style:".app-navigation { position:relative!important; top:0!important; }"});
}
async function mobileCapture(page:Page,name:string){
 await page.setViewportSize({width:390,height:844});
 const overflow=await page.evaluate(()=>({fits:document.documentElement.scrollWidth<=innerWidth,elements:Array.from(document.querySelectorAll("main *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width}))}));
 expect(overflow.fits,name+" document fits viewport: "+JSON.stringify(overflow.elements)).toBe(true);
 const dialog=page.getByRole("dialog");
 if(await dialog.count()){
  expect(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1),name+" dialog fits viewport").toBe(true);
  const box=await dialog.boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(391);expect(box!.y+box!.height).toBeLessThanOrEqual(845);
 }
 await capture(page,name);
 await page.setViewportSize({width:1440,height:960});
}
test.describe("reference interface restoration",()=>{
 test.skip(!local||!secret,"UI fixtures require an isolated local Supabase stack.");
 test.beforeEach(async({page})=>{
  await page.setViewportSize({width:1440,height:960});
  admin=createClient(url,secret!,{auth:{persistSession:false,autoRefreshToken:false}});
  email=`ui-fixture-${Date.now()}-${Math.floor(Math.random()*10000)}@example.com`;
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:"UI Fixture"}});
  expect(created.error).toBeNull();userId=created.data.user!.id;
  const profile=await admin.from("profiles").update({onboarding_status:"completed"}).eq("id",userId);expect(profile.error).toBeNull();
  const simulation=await admin.from("simulations").select("id,slug").eq("position_id","IT-03").eq("is_available",true).limit(1).single();expect(simulation.error).toBeNull();simId=simulation.data!.id;simSlug=simulation.data!.slug;
  const set=await admin.from("interview_sets").select("id,slug").eq("position_id","IT-03").eq("is_available",true).limit(1).single();expect(set.error).toBeNull();interviewId=set.data!.id;interviewSlug=set.data!.slug;
  await page.goto("/signin");await page.getByLabel("Email",{exact:true}).fill(email);await page.getByLabel("Mật khẩu",{exact:true}).fill(password);await page.getByRole("button",{name:"Đăng nhập →",exact:true}).click();await expect(page).toHaveURL(/\/dashboard/);await capture(page,"dashboard.png");
 });
 test.afterEach(async()=>{
  if(!userId)return;
  const {data:files}=await admin.from("employer_content").select("assignment_path,rubric_path").eq("owner_id",userId);
  const paths=(files??[]).flatMap(f=>[f.assignment_path,f.rubric_path]).filter((p):p is string=>typeof p==="string"&&p.startsWith(userId+"/"));
  if(paths.length){const removed=await admin.storage.from("business-documents").remove(paths);expect(removed.error).toBeNull();}
  const deleted=await admin.auth.admin.deleteUser(userId);expect(deleted.error).toBeNull();userId="";
 });
 test("dashboard uses current navigation and compact suggestion titles",async({page})=>{
  const saved=await admin.from("cv_analyses").insert({user_id:userId,position_id:"IT-03",position_title:"Data Analyst",result:{provider:"rules",strengths:[],skillGaps:[]}});expect(saved.error).toBeNull();
  await page.goto("/dashboard");
  await expect(page.locator('a[href="/career-discovery"],a[href="/roadmap/new"],a[href="/account"]')).toHaveCount(0);
  await expect(page.getByRole("navigation",{name:"Không gian nghề nghiệp"}).getByRole("link",{name:"Báo cáo năng lực",exact:true})).toHaveAttribute("href","/report");
  await expect(page.locator(".d-suggest-name").first()).toHaveText(/^Data Analyst/);expect((await page.locator(".d-suggest-name").first().innerText()).length).toBeLessThan(100);
  await expect(page.locator(".d-suggest")).not.toContainText("Một chuỗi cà phê");
  await page.locator(".account-menu > summary").click();await expect(page.getByRole("button",{name:"Đăng xuất",exact:true})).toBeVisible();await page.locator(".account-menu > summary").click();
  await page.getByRole("textbox",{name:"Tìm kiếm tính năng",exact:true}).fill("báo cáo");await expect(page.locator('.dashboard-search-results a[href="/report"]')).toBeVisible();
  await page.getByRole("textbox",{name:"Tìm kiếm tính năng",exact:true}).fill("phỏng vấn");await expect(page.locator('.dashboard-search-results a[href="/interviews"]')).toBeVisible();
  await page.getByRole("textbox",{name:"Tìm kiếm tính năng",exact:true}).fill("");
  await capture(page,"dashboard-compact-suggestions.png");
  await page.setViewportSize({width:1024,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:1440,height:960});
  await mobileCapture(page,"dashboard-compact-suggestions-mobile.png");
  const nav=page.getByRole("navigation",{name:"Không gian nghề nghiệp"});await expect(nav.getByRole("link").last()).toHaveText("Báo cáo năng lực");
  await nav.getByRole("link",{name:"Báo cáo năng lực",exact:true}).click();await expect(page).toHaveURL(/\/report$/);
  await expect(nav.getByRole("link",{name:"Báo cáo năng lực",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByRole("heading",{name:"Hồ sơ năng lực ứng viên",exact:true})).toBeVisible();
 });
 test("report downloads a private PDF and dashboard recommends the selected CV role",async({page,browser})=>{
  const saved=await admin.from("cv_analyses").insert({user_id:userId,position_id:"IT-03",position_title:"Data Analyst",result:{provider:"rules",strengths:[],skillGaps:[]}});expect(saved.error).toBeNull();
  await page.goto("/dashboard");await expect(page.locator(".d-suggest-card").nth(1).getByRole("link").first()).toHaveAttribute("href",`/simulations/${simSlug}`);
  await page.goto("/report");await expect(page.getByText("Chưa đủ dữ liệu đánh giá",{exact:true})).toBeVisible();
  const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Tải báo cáo PDF",exact:true}).first().click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^Ready2Work-Report-.*\.pdf$/);
  const pdf=await getDocumentProxy(new Uint8Array(await readFile((await download.path())!)));
  try{const result=await extractText(pdf,{mergePages:true});expect(result.text).toContain(email);expect(result.text).toContain("Data Analyst");expect(result.text).toContain("Chưa đủ dữ liệu đánh giá");}finally{await pdf.loadingTask.destroy();}
  const anonymous=await browser.newContext();try{const response=await anonymous.request.get(new URL("/api/report/pdf",page.url()).href);expect(response.status()).toBe(401);expect(response.headers()["cache-control"]).toBe("private, no-store");}finally{await anonymous.close();}
  await capture(page,"report-download.png");await mobileCapture(page,"report-download-mobile.png");
 });
 test("CV result filters and action path render all saved findings",async({page})=>{
  const result={provider:"rules",positionId:"IT-03",positionTitle:"Data Analyst",overallMatchScore:75,summary:"UI fixture — saved result layout test; not a live AI evaluation.",strengths:[{skillName:"SQL",category:"Chuyên môn",candidateEvidence:"UI fixture: SQL project",status:"matched",gapDescription:"",recommendedAction:"Luyện tập SQL",weight:5}],skillGaps:[{skillName:"Power BI",category:"Công cụ",candidateEvidence:"",status:"missing",gapDescription:"UI fixture: cần thêm bằng chứng",recommendedAction:"Xây dựng dashboard",weight:4},{skillName:"Trình bày",category:"Kỹ năng mềm",candidateEvidence:"",status:"partial",gapDescription:"UI fixture: bằng chứng một phần",recommendedAction:"Luyện phỏng vấn",weight:0}],recommendedLearningPath:[{skillGap:"Power BI",action:"Xây dựng dashboard",activityType:"Mô phỏng việc làm",positionId:"IT-03"}]};
  const saved=await admin.from("cv_analyses").insert({user_id:userId,position_id:"IT-03",position_title:"Data Analyst",result});expect(saved.error).toBeNull();
  await page.goto("/roadmap/cv");await expect(page.getByRole("heading",{name:/Bảng đối chiếu chi tiết/})).toBeVisible();
  await page.getByRole("button",{name:"Công cụ",exact:true}).click();await expect(page.locator(".rm-details-table tbody tr")).toHaveCount(1);await expect(page.locator(".rm-details-table")).toContainText("Power BI");await expect(page.locator(".rm-path-card a").first()).toHaveAttribute("href",/position=IT-03/);
  await capture(page,"cv-result.png");await mobileCapture(page,"cv-result-mobile.png");
  await page.getByRole("button",{name:/Đổi vị trí mục tiêu/}).click();await expect(page.getByRole("heading",{name:"Thiết lập hành trình nghề nghiệp"})).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
 test("simulation workspace keeps timed start and formatted plain-text submission",async({page})=>{
  await page.goto(`/simulations/${simSlug}`);await page.getByRole("button",{name:"Nhận việc & Bắt đầu tính giờ",exact:true}).click();await expect(page).toHaveURL(/attempt=/);await expect(page.locator(".workspace-split")).toBeVisible();
  await page.getByRole("button",{name:"Tab 2 Tài liệu tham khảo",exact:true}).click();
  await expect(page.locator(".panel-content").getByRole("heading",{name:"Dữ liệu doanh thu và số đơn thực tế",exact:true})).toBeVisible();
  const inputTable=page.locator(".panel-content table");
  await expect(inputTable).toHaveCount(1);
  await expect(inputTable.locator("th")).toHaveText(["Chi nhánh","Tháng 5 (đơn/ doanh thu)","Tháng 6","Tháng 7","Tháng 8"]);
  await expect(inputTable.locator("tbody tr")).toHaveCount(4);
  await expect(inputTable.locator("tbody tr").first().locator("td")).toHaveText(["Q1","420 đơn / 21.0tr","460 đơn / 23.0tr","510 đơn / 25.5tr","560 đơn / 28.0tr"]);
  await expect(inputTable.locator("tbody tr td:first-child")).toHaveText(["Q1","Q3","Bình Thạnh","Thủ Đức"]);
  await page.getByRole("button",{name:"Tab 1 Đề bài",exact:true}).click();const editor=page.getByRole("textbox",{name:"Nội dung bài làm"});await editor.fill("UI fixture: analysis with evidence and a proposed solution.");await editor.selectText();await page.getByRole("button",{name:"In đậm",exact:true}).click();await expect(page.locator('input[name="content"]')).toHaveValue(/UI fixture: analysis/);await expect(editor.locator("b,strong")).toContainText("UI fixture");
  await capture(page,"simulation-workspace.png");await mobileCapture(page,"simulation-workspace-mobile.png");
  const inserted=await admin.from("simulation_submissions").insert({user_id:userId,simulation_id:simId,content:"UI fixture, not evaluated",overall_score:80,overall_band:"Proficient",criterion_scores:{summary:"UI fixture — not live AI feedback.",criteria:[{criterionId:"1",label:"Độ chính xác",score:80,maxScore:100,band:"Proficient",feedback:"UI fixture: bằng chứng rõ."},{criterionId:"2",label:"Lập luận",score:70,maxScore:100,band:"Developing",feedback:"UI fixture: cần thêm lập luận."},{criterionId:"3",label:"Trình bày",score:90,maxScore:100,band:"Strong",feedback:"UI fixture: rõ ràng."}]}}).select("id").single();expect(inserted.error).toBeNull();submissionId=inserted.data!.id;
  await page.goto(`/simulations/submissions/${submissionId}`);await expect(page.getByRole("heading",{name:"Báo cáo kết quả",exact:true})).toBeVisible();await expect(page.getByRole("img",{name:"Biểu đồ điểm thực tế"})).toBeVisible();await capture(page,"simulation-report.png");await mobileCapture(page,"simulation-report-mobile.png");
 });
 test("interview restores separate catalogs, mic failure, answer modes and detailed feedback",async({page})=>{
  await page.goto("/interviews?explore=1");
  await page.getByRole("tab",{name:"Bộ câu hỏi chung",exact:true}).click();
  const sourceSets=Object.entries(interviewSource);
  expect(sourceSets).toHaveLength(15);
  await expect(page.locator(".iv-pos-card")).toHaveCount(15);
  const sourceLinks=await page.locator(".iv-pos-card").evaluateAll(entries=>entries.map(entry=>entry.getAttribute("href")));
  expect(sourceLinks.sort()).toEqual(sourceSets.map(([slug,set])=>`/interviews/r2w-${slug}-${set.contentVersion}`).sort());
  for(const [industryId,industryName] of [["IT","Công nghệ thông tin"],["KK","Kế toán - Kiểm toán"],["TCNH","Tài chính - Ngân hàng"],["LOG","Logistics"],["MKT","Marketing"]] as const){
   await page.getByRole("button",{name:industryName,exact:true}).click();
   await expect(page.locator(".iv-pos-card")).toHaveCount(3);
   const expected=sourceSets.filter(([,set])=>set.industryId===industryId);
   expect(expected).toHaveLength(3);
   expect((await page.locator(".iv-pos-title").allTextContents()).sort()).toEqual(expected.map(([,set])=>set.positionTitle).sort());
   const links=await page.locator(".iv-pos-card").evaluateAll(entries=>entries.map(entry=>entry.getAttribute("href")));
   expect(links.sort()).toEqual(expected.map(([slug,set])=>`/interviews/r2w-${slug}-${set.contentVersion}`).sort());
  }
  await page.getByRole("button",{name:"Tất cả",exact:true}).click();
  await page.getByRole("tab",{name:"Từ doanh nghiệp",exact:true}).click();
  await expect(page.getByRole("tab",{name:"Từ doanh nghiệp",exact:true})).toHaveAttribute("aria-selected","true");
  for(const slug of ["big4-audit-round1","3pl-operations-round1","fmcg-brand-round1","commercial-bank-credit-round1","product-company-data-round1"]){
   await expect(page.locator(`a[href="/interviews/${slug}"]`)).toHaveCount(0);
  }
  const companyLinks=await page.locator(".iv-company-card").evaluateAll(entries=>entries.map(entry=>entry.getAttribute("href")));
  for(const link of companyLinks)expect(link).toMatch(/^\/interviews\/company-[0-9a-f-]{36}$/i);
  if(!companyLinks.length)await expect(page.getByText("Chưa có bộ câu hỏi phù hợp với lựa chọn này.",{exact:true})).toBeVisible();
  await page.getByRole("tab",{name:"Bộ câu hỏi chung",exact:true}).click();await expect(page.locator(".iv-pos-card")).toHaveCount(15);
  await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,"getUserMedia",{value:()=>Promise.reject(new DOMException("Test denied","NotAllowedError")),configurable:true})});
  await page.goto(`/interviews/${interviewSlug}`);await page.getByRole("button",{name:"↻ Thử lại",exact:true}).click();await expect(page.getByRole("status")).toContainText("bị từ chối");await capture(page,"interview-waiting.png");
  await page.getByRole("button",{name:"Bắt đầu Phỏng vấn",exact:true}).click();await expect(page).toHaveURL(/\/sessions\//);await expect(page.locator(".iv-interview-main")).toBeVisible();await page.getByRole("tab",{name:"Trả lời bằng Giọng nói"}).click();await expect(page.getByRole("button",{name:"Bắt đầu nhận giọng nói"})).toBeVisible();await capture(page,"interview-voice.png");await mobileCapture(page,"interview-voice-mobile.png");await page.getByRole("tab",{name:"Trả lời bằng Văn bản"}).click();await page.getByRole("textbox",{name:"Câu trả lời",exact:true}).fill("UI fixture: my answer content.");await expect(page.locator('input[name="answerText"]')).toHaveValue("UI fixture: my answer content.");
  const questions=await admin.from("interview_questions").select("id,round_number").eq("set_id",interviewId);expect(questions.error).toBeNull();
  const session=await admin.from("interview_sessions").insert({user_id:userId,set_id:interviewId}).select("id").single();expect(session.error).toBeNull();completedSession=session.data!.id;
  const answers=await admin.from("interview_answers").insert(questions.data!.map(q=>({session_id:completedSession,question_id:q.id,answer_text:"UI fixture — not a candidate answer",score:80,criteria:[{label:"Nội dung",score:80,maxScore:100,note:"UI fixture: nêu thêm bằng chứng cụ thể."}]})));expect(answers.error).toBeNull();
  const completion=await admin.from("interview_sessions").update({completed_at:new Date().toISOString(),overall_score:80,round_scores:[1,2,3].map(round=>({round,score:80,questionCount:questions.data!.filter(q=>q.round_number===round).length}))}).eq("id",completedSession);expect(completion.error).toBeNull();
  await page.goto(`/interviews/sessions/${completedSession}/feedback`);await expect(page.getByRole("heading",{name:"Báo cáo đánh giá phỏng vấn",exact:true})).toBeVisible();await page.getByText(/Vòng 2: Chuyên môn ·/,{exact:false}).click();const round=page.locator(".iv-round-detail").nth(1);await round.getByRole("button",{name:"Tôi cần cải thiện gì?"}).click();await expect(round.locator(".iv-bot-reply-bubble")).toContainText("UI fixture: nêu thêm bằng chứng cụ thể.");await capture(page,"interview-report.png");await mobileCapture(page,"interview-report-mobile.png");
 });
 test("business onboarding completes every step without granting publishing access",async({page})=>{
  const changed=await admin.from("profiles").update({onboarding_status:"not_started"}).eq("id",userId);expect(changed.error).toBeNull();
  await page.evaluate(()=>sessionStorage.setItem("r2w:onboarding","business"));await page.goto("/business");
  const dialog=page.getByRole("dialog",{name:"Thiết lập tài khoản"});await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox",{name:"Tên doanh nghiệp",exact:true}).fill("UI Fixture Onboarding Company");
  await dialog.getByRole("textbox",{name:"Lĩnh vực hoạt động",exact:true}).fill("Marketing");
  await dialog.getByRole("textbox",{name:"Người liên hệ",exact:true}).fill("UI Fixture");
  await dialog.getByRole("combobox",{name:"Quy mô nhân sự"}).selectOption("1–50 người");
  await dialog.getByRole("button",{name:"Lưu hồ sơ doanh nghiệp",exact:true}).click();
  await expect(dialog.getByRole("button",{name:"Tiếp tục →",exact:true})).toBeEnabled();
  await capture(page,"business-onboarding-company.png");await mobileCapture(page,"business-onboarding-company-mobile.png");
  await dialog.getByRole("button",{name:"Tiếp tục →",exact:true}).click();await dialog.getByRole("button",{name:"Sàng lọc ứng viên",exact:true}).click();
  await dialog.getByRole("button",{name:"Tiếp tục →",exact:true}).click();await dialog.getByRole("button",{name:"Marketing",exact:true}).click();
  await dialog.getByLabel("Nhu cầu tuyển dụng").fill("UI fixture: Marketing intern");await dialog.getByRole("button",{name:"Tiếp tục →",exact:true}).click();
  await expect(dialog.getByRole("heading",{name:"Đăng ký thành công!",exact:true})).toBeVisible();await capture(page,"business-onboarding-pending.png");
  await dialog.getByRole("button",{name:"Bắt đầu hành trình →",exact:true}).click();await expect(dialog).not.toBeVisible();
  const profile=await admin.from("profiles").select("onboarding_status").eq("id",userId).single();expect(profile.data?.onboarding_status).toBe("completed");
  const account=await admin.auth.admin.getUserById(userId);expect(account.data.user?.user_metadata.onboarding_preferences.goals).toContain("Sàng lọc ứng viên");
  const roles=await admin.from("user_roles").select("role").eq("user_id",userId);expect(roles.data?.map(r=>r.role)).toContain("employer_pending");expect(roles.data?.map(r=>r.role)).not.toContain("employer_admin");
 });
 test("business editors save paired content using existing upload and approval rules",async({page})=>{
  await page.goto("/business");await page.getByRole("textbox",{name:"Tên doanh nghiệp",exact:true}).fill("UI Fixture Company");await page.getByRole("textbox",{name:"Lĩnh vực hoạt động",exact:true}).fill("Công nghệ thông tin");await page.getByRole("textbox",{name:"Người liên hệ",exact:true}).fill("UI Fixture");await page.getByRole("button",{name:"Lưu hồ sơ doanh nghiệp",exact:true}).click();await expect(page.getByText("Đang chờ duyệt",{exact:true})).toBeVisible();
  await page.goto("/business?tab=simulation");await page.getByRole("button",{name:"+ Tạo đề bài mới",exact:true}).click();let dialog=page.getByRole("dialog");await dialog.getByLabel("Tiêu đề",{exact:true}).fill("UI Fixture Simulation Assignment");await dialog.getByRole("combobox",{name:"Vị trí tuyển dụng",exact:true}).selectOption("IT-03");await dialog.getByLabel("Bối cảnh",{exact:true}).fill("UI fixture context: analyze a business dataset and report the main trends for a business decision.");await dialog.getByLabel("Yêu cầu đề bài",{exact:true}).fill("Provide the analysis, explain the evidence and propose a practical recommendation.");await dialog.getByLabel("Trọng số /100",{exact:true}).first().fill("39");await dialog.getByRole("button",{name:"Lưu đề bài và tiêu chí",exact:true}).click();await expect(dialog.getByRole("alert")).toContainText("100");await dialog.getByLabel("Trọng số /100",{exact:true}).first().fill("40");await capture(page,"business-simulation-editor.png");await mobileCapture(page,"business-simulation-editor-mobile.png");await dialog.getByRole("button",{name:"Lưu đề bài và tiêu chí",exact:true}).click();await expect(dialog).not.toBeVisible();await expect(page.getByRole("heading",{name:"UI Fixture Simulation Assignment",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Xuất bản",exact:true})).toHaveCount(0);
  await page.goto("/business?tab=interview");await page.getByRole("button",{name:"+ Tạo đề bài mới",exact:true}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Tiêu đề",{exact:true}).fill("UI Fixture Interview Assignment");await dialog.getByRole("combobox",{name:"Vị trí tuyển dụng",exact:true}).selectOption("IT-03");for(let i=0;i<3;i++){await dialog.getByRole("textbox",{name:"Nội dung câu hỏi",exact:true}).nth(i).fill(`UI fixture question for round ${i+1}: explain your analysis and supporting evidence.`);await dialog.getByRole("textbox",{name:"Đáp án mẫu / Tiêu chí đạt điểm",exact:true}).nth(i).fill("Explain the analysis, evidence and a reasonable conclusion.");}await dialog.getByRole("button",{name:"Lưu nháp trên thiết bị",exact:true}).click();
  expect(await page.evaluate(key=>Boolean(sessionStorage.getItem(key)),"r2w:business-draft:"+userId+":interview")).toBe(true);
  await page.keyboard.press("Escape");await page.getByRole("button",{name:"Tiếp tục bản nháp trên thiết bị",exact:true}).click();
  await expect(dialog.getByRole("textbox",{name:"Nội dung câu hỏi",exact:true}).first()).toHaveValue(/UI fixture question for round 1/);
  await capture(page,"business-interview-editor.png");await mobileCapture(page,"business-interview-editor-mobile.png");await dialog.getByRole("button",{name:"Lưu đề bài và tiêu chí",exact:true}).click();await expect(dialog).not.toBeVisible();await expect(page.getByRole("heading",{name:"UI Fixture Interview Assignment",exact:true})).toBeVisible();await capture(page,"business-interview-library.png");await mobileCapture(page,"business-interview-library-mobile.png");await page.getByRole("button",{name:"Chỉnh sửa thành bản sao",exact:true}).click();await expect(page.getByRole("dialog").getByRole("textbox",{name:"Nội dung câu hỏi",exact:true}).first()).toHaveValue(/UI fixture question for round 1/);
  await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/business");await capture(page,"business-dashboard.png");await mobileCapture(page,"business-dashboard-mobile.png");
  await page.getByRole("button",{name:/⌄ Data Analyst/}).first().click();
  await page.getByRole("button",{name:"Xếp hạng",exact:true}).first().click();await expect(page.getByRole("dialog",{name:"Bảng xếp hạng"})).toContainText("Chưa có dữ liệu");await capture(page,"business-ranking.png");await page.keyboard.press("Escape");
  await page.getByRole("button",{name:"Feedback",exact:true}).first().click();await expect(page.getByRole("dialog",{name:"Feedback ứng viên"})).toContainText("Chưa có phản hồi");await page.keyboard.press("Escape");
  for(const [button,title] of [["Thông tin công ty","Thông tin công ty"],["Nâng cấp gói","Nâng cấp gói B2B"],["Liên hệ tư vấn viên","Liên hệ tư vấn viên"]]){
   await page.locator(".business-account>summary").click();await page.locator(".business-account").getByRole("button",{name:button,exact:true}).click();await expect(page.getByRole("dialog",{name:title})).toBeVisible();await page.keyboard.press("Escape");
   await page.locator(".business-account").evaluate(e=>e.removeAttribute("open"));
  }

 });
});
