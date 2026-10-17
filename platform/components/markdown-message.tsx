import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Safely renders AI-authored Markdown. Raw HTML is disabled by default. */
export function MarkdownMessage({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children: content }) => (
          <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{content}</h3>
        ),
        h2: ({ children: content }) => (
          <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{content}</h3>
        ),
        h3: ({ children: content }) => (
          <h3 className="mb-2 mt-3 font-semibold first:mt-0">{content}</h3>
        ),
        p: ({ children: content }) => (
          <p className="my-2 whitespace-pre-wrap first:mt-0 last:mb-0">{content}</p>
        ),
        ul: ({ children: content }) => (
          <ul className="my-2 list-disc space-y-2 pl-5">{content}</ul>
        ),
        ol: ({ children: content, start }) => (
          <ol start={start} className="my-2 list-decimal space-y-2 pl-5">{content}</ol>
        ),
        li: ({ children: content }) => <li className="pl-1">{content}</li>,
        strong: ({ children: content }) => (
          <strong className="font-semibold text-foreground">{content}</strong>
        ),
        em: ({ children: content }) => <em className="text-muted">{content}</em>,
        blockquote: ({ children: content }) => (
          <blockquote className="my-2 border-l-2 border-primary pl-3 text-muted">
            {content}
          </blockquote>
        ),
        a: ({ children: content, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-primary underline underline-offset-2"
          >
            {content}
          </a>
        ),
        code: ({ children: content }) => (
          <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">{content}</code>
        ),
        pre: ({ children: content }) => (
          <pre className="my-2 overflow-x-auto rounded-lg bg-background p-3 text-xs">
            {content}
          </pre>
        ),
        table: ({ children: content }) => (
          <div className="my-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">{content}</table>
          </div>
        ),
        th: ({ children: content }) => (
          <th className="border border-border bg-background px-2 py-1 font-semibold">{content}</th>
        ),
        td: ({ children: content }) => (
          <td className="border border-border px-2 py-1 align-top">{content}</td>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
