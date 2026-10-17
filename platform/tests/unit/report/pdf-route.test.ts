import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), overview: vi.fn(), render: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: mocks.user }));
vi.mock("@/lib/report/data", () => ({ getCandidateOverview: mocks.overview }));
vi.mock("@/lib/report/pdf", () => ({ renderReportPdf: mocks.render }));
import { GET } from "@/app/api/report/pdf/route";

describe("private report download", () => {
  beforeEach(() => vi.resetAllMocks());
  it("requires a signed-in, active account before reading any progress", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    mocks.user.mockResolvedValue({ id: "blocked", accountStatus: "suspended" });
    expect((await GET()).status).toBe(403);
    expect(mocks.overview).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });
  it("exports only the verified owner's data as a private attachment", async () => {
    const user = { id: "owner", email: "owner@example.test", displayName: "Ứng viên", accountStatus: "active" };
    mocks.user.mockResolvedValue(user);
    mocks.overview.mockResolvedValue({ target: null });
    mocks.render.mockResolvedValue(Buffer.from("%PDF-1.7"));
    const response = await GET();
    expect(mocks.overview).toHaveBeenCalledWith("owner");
    expect(mocks.render).toHaveBeenCalledWith(user, { target: null }, expect.any(Date));
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename="Ready2Work-Report-/);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).toBe("%PDF-1.7");
  });
  it("does not leak database or provider errors in download responses", async () => {
    mocks.user.mockResolvedValue({ id: "owner", accountStatus: "active" });
    mocks.overview.mockRejectedValue(new Error("private database credentials"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).not.toContain("credentials");
  });
});
