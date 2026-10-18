import { beforeEach, describe, expect, it, vi } from "vitest";
import simulationRubric from "@/public/templates/simulation-rubric.json";
import interviewRubric from "@/public/templates/interview-rubric.json";
import interviewAssignment from "@/public/templates/interview-assignment.json";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(), userFrom: vi.fn(), serviceFrom: vi.fn(), upload: vi.fn(), remove: vi.fn(),
  storageFrom: vi.fn(), extract: vi.fn(), rpc: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: mocks.requireUser,
  hasRole: (user: { roles: string[] }, ...roles: string[]) => roles.some((role) => user.roles.includes(role)),
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ from: mocks.userFrom, storage: { from: mocks.storageFrom } })) }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleClient: vi.fn(() => ({ from: mocks.serviceFrom, rpc: mocks.rpc })) }));
vi.mock("@/lib/business/read-assignment", () => ({ readBusinessAssignment: mocks.extract }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { publishBusinessContentAction, saveCompanyAction, uploadBusinessContentAction } from "@/app/business/actions";

function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), in: vi.fn(() => chain), limit: vi.fn(() => chain),
    insert: vi.fn((payload: unknown) => { void payload; return chain; }), upsert: vi.fn(() => chain), maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}
const owner = "00000000-0000-4000-8000-000000000001";
const contentId = "00000000-0000-4000-8000-000000000002";
function form(kind = "simulation") {
  const data = new FormData();
  data.set("title", "Evidence based work assignment"); data.set("kind", kind); data.set("positionId", "IT-03");
  data.set("assignment", new File([kind === "simulation" ? "A work assignment with context and requirements for analysis." : JSON.stringify(interviewAssignment)], kind === "simulation" ? "assignment.txt" : "assignment.json", { type: kind === "simulation" ? "text/plain" : "application/json" }));
  data.set("rubric", new File([JSON.stringify(kind === "simulation" ? simulationRubric : interviewRubric)], "rubric.json", { type: "application/json" }));
  return data;
}
function publishForm() { const data = new FormData(); data.set("id", contentId); return data; }
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: owner, email: "owner@example.com", roles: ["mentee"], accountStatus: "active" });
  mocks.userFrom.mockImplementation((table: string) => query(table === "company_profiles" ? { name: "Owned company" } : []));
  mocks.serviceFrom.mockReturnValue(query(null));
  mocks.upload.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null }); mocks.rpc.mockResolvedValue({ error: null });
  mocks.storageFrom.mockReturnValue({ upload: mocks.upload, remove: mocks.remove });
  mocks.extract.mockResolvedValue("A work assignment with context and requirements for analysis.");
});

describe("business draft uploads", () => {
  it("requires authentication before reading or writing any company data", async () => {
    mocks.requireUser.mockRejectedValue(new Error("REDIRECT:/signin"));
    await expect(uploadBusinessContentAction({}, form())).rejects.toThrow("REDIRECT:/signin");
    expect(mocks.userFrom).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.serviceFrom).not.toHaveBeenCalled();
  });
  it("requires the signed-in user's company before accepting a paired upload", async () => {
    const company = query(null); mocks.userFrom.mockReturnValue(company);
    expect((await uploadBusinessContentAction({}, form())).error).toContain("hồ sơ doanh nghiệp");
    expect(company.eq).toHaveBeenCalledWith("user_id", owner); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects missing file pairs and oversized rubrics before writing storage", async () => {
    const missing = form(); missing.delete("rubric");
    expect((await uploadBusinessContentAction({}, missing)).error).toContain("Cần cả đề bài");
    const oversized = form(); oversized.set("rubric", new File(["x".repeat(200_001)], "rubric.json"));
    expect((await uploadBusinessContentAction({}, oversized)).error).toContain("200 KB");
    expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.serviceFrom).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON and rubric weights that do not total 100", async () => {
    const malformed = form(); malformed.set("rubric", new File(["{invalid"], "rubric.json"));
    expect((await uploadBusinessContentAction({}, malformed)).error).toContain("Tệp chưa đúng mẫu");
    const wrongWeight = form(); wrongWeight.set("rubric", new File([JSON.stringify([{ ...simulationRubric[0], weight: 50 }])], "rubric.json"));
    expect((await uploadBusinessContentAction({}, wrongWeight)).error).toContain("trọng số");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("requires exact rubric coverage of every interview question across three rounds", async () => {
    const data = form("interview");
    const assignment = structuredClone(interviewAssignment);
    assignment.rounds[0]!.questions.push({ ...assignment.rounds[0]!.questions[0]!, prompt: "A second real question with no matching scoring rubric." });
    data.set("assignment", new File([JSON.stringify(assignment)], "assignment.json"));
    expect((await uploadBusinessContentAction({}, data)).error).toContain("khớp chính xác");
    expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.serviceFrom).not.toHaveBeenCalled();
  });
  it("allows an unapproved company to save a draft owned only by its signed-in user", async () => {
    const saved = query(null); mocks.serviceFrom.mockReturnValue(saved);
    const data = form(); data.set("owner_id", "spoofed-owner"); data.set("status", "published");
    expect((await uploadBusinessContentAction({}, data)).success).toBeTruthy();
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.upload.mock.calls.every((call) => String(call[0]).startsWith(`${owner}/`))).toBe(true);
    expect(saved.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: owner, kind: "simulation", position_id: "IT-03" }));
    expect(saved.insert.mock.calls[0]![0]).not.toHaveProperty("status");
  });
  it("removes the first file if the paired second upload fails", async () => {
    mocks.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error("storage unavailable") });
    expect((await uploadBusinessContentAction({}, form())).error).toContain("Không tải được tệp");
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0]![0]]);
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
  });
  it("removes both uploaded files when saving the paired record fails", async () => {
    mocks.serviceFrom.mockReturnValue(query(null, new Error("database unavailable")));
    expect((await uploadBusinessContentAction({}, form("interview"))).error).toContain("Không lưu được cặp");
    expect(mocks.remove).toHaveBeenCalledWith(mocks.upload.mock.calls.map((call) => call[0]));
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe("business publication authorization", () => {
  it("blocks unapproved companies before any content or privileged client query", async () => {
    await expect(publishBusinessContentAction(publishForm())).rejects.toThrow("cần được xác minh");
    expect(mocks.userFrom).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("cannot publish a foreign record: the ownership-scoped lookup finds no content", async () => {
    mocks.requireUser.mockResolvedValue({ id: owner, roles: ["employer_admin"] });
    const item = query(null); const company = query({ name: "Owned company" });
    mocks.userFrom.mockImplementation((table: string) => table === "employer_content" ? item : company);
    await publishBusinessContentAction(publishForm());
    expect(item.eq).toHaveBeenCalledWith("id", contentId); expect(item.eq).toHaveBeenCalledWith("owner_id", owner);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("publishes an owned draft through the atomic server RPC using the authenticated actor", async () => {
    mocks.requireUser.mockResolvedValue({ id: owner, roles: ["employer_member"] });
    mocks.userFrom.mockImplementation((table: string) => query(table === "employer_content" ? { id: contentId, status: "draft" } : { name: "Owned company" }));
    const data = publishForm(); data.set("actor_id", "spoofed-actor");
    await publishBusinessContentAction(data);
    expect(mocks.rpc).toHaveBeenCalledWith("publish_employer_content", { content_id: contentId, actor_id: owner });
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
    expect(mocks.revalidate.mock.calls.map((call) => call[0])).toEqual(["/business", "/simulations", "/interviews"]);
  });
  it("does not republish an already published record or refresh catalogs after an RPC failure", async () => {
    mocks.requireUser.mockResolvedValue({ id: owner, roles: ["employer_admin"] });
    mocks.userFrom.mockImplementation((table: string) => query(table === "employer_content" ? { status: "published" } : { name: "Owned company" }));
    await publishBusinessContentAction(publishForm()); expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.userFrom.mockImplementation((table: string) => query(table === "employer_content" ? { status: "draft" } : { name: "Owned company" }));
    mocks.rpc.mockResolvedValue({ error: new Error("transaction rolled back") });
    await expect(publishBusinessContentAction(publishForm())).rejects.toThrow("Chưa xuất bản được");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe("company profile validation", () => {
  it("rejects an unsafe website scheme before persisting the profile", async () => {
    const data = new FormData(); Object.entries({ name: "Valid company", industry: "Technology", contact_name: "Contact Person", website: "javascript:alert(1)" }).forEach(([key, value]) => data.set(key, value));
    expect((await saveCompanyAction({}, data)).error).toContain("HTTPS");
    expect(mocks.userFrom).not.toHaveBeenCalled();
  });
});
