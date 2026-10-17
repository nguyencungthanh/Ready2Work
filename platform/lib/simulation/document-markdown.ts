import "server-only";
import { DOMParser } from "@xmldom/xmldom";

/** Mammoth's semantic HTML is converted to text with tables; never execute uploaded HTML. */
export function submissionHtmlToMarkdown(html: string): string {
  const fail = () => { throw new Error("Chưa đọc được cấu trúc tài liệu bài làm."); };
  const doc = new DOMParser({ errorHandler: { warning: () => {}, error: fail, fatalError: fail } }).parseFromString(`<main>${html}</main>`, "text/html");
  const children = (node: Node) => Array.from(node.childNodes);
  function walk(node: Node, depth = 0): string {
    if (depth > 100) throw new Error("Tài liệu có cấu trúc quá phức tạp. Hãy đơn giản hóa hoặc dán nội dung bài làm.");
    if (node.nodeType === 3) return node.nodeValue ?? "";
    const name = node.nodeName.toLowerCase();
    const content = () => children(node).map((child) => walk(child, depth + 1)).join("");
    if (["script", "style", "img"].includes(name)) return "";
    if (name === "br") return "\n";
    if (name === "table") {
      const rows = Array.from((node as Element).getElementsByTagName("tr")).map((row) => children(row).filter((cell) => ["td", "th"].includes(cell.nodeName.toLowerCase())).flatMap((cell) => {
        const span = Math.min(20, Math.max(1, Number((cell as Element).getAttribute("colspan")) || 1));
        return [walk(cell, depth + 1).trim().replace(/\s+/g, " ").replaceAll("|", "\\|"), ...Array.from({ length: span - 1 }, () => "")];
      }));
      if (!rows.length) return "";
      const columns = Math.max(...rows.map((row) => row.length));
      const lines = rows.map((row) => `| ${[...row, ...Array.from({ length: columns - row.length }, () => "")].join(" | ")} |`);
      return `\n\n${[lines[0], `| ${Array.from({ length: columns }, () => "---").join(" | ")} |`, ...lines.slice(1)].join("\n")}\n\n`;
    }
    if (name === "ol") {
      const start = Math.max(1, Number((node as Element).getAttribute("start")) || 1);
      return "\n" + children(node).filter((child) => child.nodeName.toLowerCase() === "li").map((child, index) => `${start + index}. ${children(child).map((part) => walk(part, depth + 1)).join("").trim()}`).join("\n") + "\n";
    }
    if (name === "li") return `- ${content().trim()}\n`;
    if (/^h[1-6]$/.test(name)) return `\n${"#".repeat(Number(name[1]))} ${content().trim()}\n\n`;
    if (name === "p") return `${content().trim()}\n\n`;
    if (name === "strong" || name === "b") return `**${content()}**`;
    if (name === "em" || name === "i") return `*${content()}*`;
    return content();
  }
  return walk(doc.documentElement).replace(/\n{3,}/g, "\n\n").trim();
}
