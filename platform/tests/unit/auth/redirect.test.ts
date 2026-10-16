import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/auth/redirect";
describe("post-auth return paths", () => {
  it("keeps real app return paths", () => { expect(safeReturnPath("/business?tab=interview")).toBe("/business?tab=interview"); });
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/\nevil.test", null, 5])("rejects external or malformed paths %s", (path) => {
    expect(safeReturnPath(path)).toBe("/dashboard");
  });
});
