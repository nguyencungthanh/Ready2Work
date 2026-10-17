import { describe, expect, it } from "vitest";
import { submissionHtmlToMarkdown } from "@/lib/simulation/document-markdown";

describe("DOCX submission structure", () => {
  it("keeps table columns, rows and numbered explanations in the imported answer", () => {
    const text = submissionHtmlToMarkdown('<p>Phân tích</p><table><tr><th>Chỉ tiêu</th><th>Kết quả</th></tr><tr><td><p>Doanh thu</p></td><td><p>100</p></td></tr></table><ol start="2"><li><p>Đối chiếu số liệu</p></li></ol>');
    expect(text).toContain("| Chỉ tiêu | Kết quả |");
    expect(text).toContain("| Doanh thu | 100 |");
    expect(text).toContain("2. Đối chiếu số liệu");
  });
  it("never executes or preserves embedded executable markup", () => {
    const text = submissionHtmlToMarkdown('<p>Nhận xét</p><script>privateScript()</script><img src="https://outside.invalid"/><p>Kết luận</p>');
    expect(text).toContain("Kết luận");
    expect(text).not.toContain("privateScript");
    expect(text).not.toContain("outside.invalid");
  });
});
