"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ReferenceIcon } from "./icon";
import { ASSISTANT_FEATURE_PATHS, ASSISTANT_MAX_REPLY_TEXT, ASSISTANT_MAX_USER_TEXT, assistantRequestHistory, type AssistantTurn } from "@/lib/assistant/limits";
import { readAssistantReply } from "@/lib/assistant/read-stream";

interface Message extends AssistantTurn { id: number }
class AssistantResponseError extends Error {}
const connectionError = "Mình chưa thể trả lời lúc này. Tin nhắn của bạn vẫn được giữ; bạn thử lại nhé.";

function AssistantReply({ text }: { text: string }) {
  return <ReactMarkdown components={{
    p: ({ children }) => <p className="my-2 whitespace-pre-wrap first:mt-0 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children, start }) => <ol start={start} className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
    pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded bg-white p-3 text-xs">{children}</pre>,
    img: ({ alt }) => alt ? <span>{alt}</span> : null,
    a: ({ href, children }) => href && href.startsWith("/") && !/[\\\u0000-\u0020]/.test(href) && (ASSISTANT_FEATURE_PATHS as readonly string[]).includes(href.split(/[?#]/)[0] ?? "")
      ? <Link href={href} className="font-semibold text-primary underline">{children}</Link> : <span>{children}</span>,
  }}>{text}</ReactMarkdown>;
}

export function DashboardAssistant({ name }: { name: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const [failedRequest, setFailedRequest] = useState<AssistantTurn[] | null>(null);
  const sequence = useRef(0);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, pending, error, streamingText]);

  async function requestReply(history: AssistantTurn[], retry = false) {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setStreamingText(""); setError(""); setFailedRequest(null);
    if (!retry) {
      const completed = messages.at(-1)?.role === "user" ? messages.slice(0, -1) : messages;
      setMessages([...completed.slice(-10), { ...history.at(-1)!, id: ++sequence.current }]);
    }
    const abort = new AbortController(); controller.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 35_000);
    try {
      const response = await fetch("/api/assistant", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify({ messages: history }), signal: abort.signal });
      let reply: string;
      if (response.ok && response.body && response.headers.get("content-type")?.includes("application/x-ndjson")) {
        reply = await readAssistantReply(response.body, setStreamingText);
      } else {
        const result: unknown = await response.json();
        if (!response.ok) {
          const message = result && typeof result === "object" && "error" in result && typeof result.error === "string" && result.error.length <= 500 ? result.error : connectionError;
          throw new AssistantResponseError(message);
        }
        if (!result || typeof result !== "object" || !("reply" in result) || typeof result.reply !== "string" || !result.reply.trim() || result.reply.length > ASSISTANT_MAX_REPLY_TEXT) throw new AssistantResponseError(connectionError);
        reply = result.reply.trim();
      }
      const replyMessage: Message = { role: "model", text: reply, id: ++sequence.current };
      setMessages((previous) => [...previous, replyMessage].slice(-12));
      setDraft("");
    } catch (failure) {
      setFailedRequest(history);
      setError(failure instanceof AssistantResponseError ? failure.message : abort.signal.aborted ? "Mình cần thêm thời gian để trả lời. Tin nhắn của bạn vẫn được giữ; bạn có thể thử gửi lại." : connectionError);
    } finally {
      window.clearTimeout(timer); controller.current = null; inFlight.current = false; setPending(false); setStreamingText("");
    }
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || pending) return;
    if (question.length > ASSISTANT_MAX_USER_TEXT) { setError("Tin nhắn tối đa 2.000 ký tự. Hãy rút gọn trước khi gửi."); return; }
    const completed = messages.at(-1)?.role === "user" ? messages.slice(0, -1) : messages;
    void requestReply(assistantRequestHistory(completed.map(({ role, text }) => ({ role, text })), question));
  }

  function clearConversation() { setMessages([]); setDraft(""); setError(""); setFailedRequest(null); }

  return <section className="d-ai-box" aria-label="R2W AI">
    <div className="d-ai-header flex items-center justify-between gap-3"><span className="d-ai-label">R2W AI</span>{messages.length > 0 && <button type="button" disabled={pending} className="text-xs text-muted underline disabled:opacity-50" onClick={clearConversation}>Xóa hội thoại</button>}</div>
    <div className="d-ai-msg"><span className="d-ai-avatar"><ReferenceIcon name="ai" size={22}/></span><p>{name || "Bạn"} ơi, mình là R2W AI. Mình có thể giúp gì cho bạn hôm nay?</p></div>
    {messages.length > 0 && <div ref={log} role="log" aria-label="Cuộc trò chuyện với R2W AI" aria-live="polite" aria-relevant="additions text" className="mb-4 max-h-96 space-y-3 overflow-y-auto pr-1 text-sm leading-6">
      {messages.map((message) => <article key={message.id} className={`max-w-[95%] rounded-xl p-3 break-words ${message.role === "user" ? "ml-auto border border-border bg-white" : "mr-auto bg-white/70"}`}><p className="mb-1 text-xs font-semibold text-muted">{message.role === "user" ? "Bạn" : "R2W AI"}</p>{message.role === "user" ? <p className="whitespace-pre-wrap">{message.text}</p> : <AssistantReply text={message.text}/>}</article>)}
      {pending && (streamingText ? <article className="mr-auto max-w-[95%] rounded-xl bg-white/70 p-3 break-words"><p className="mb-1 text-xs font-semibold text-muted">R2W AI</p><p className="whitespace-pre-wrap">{streamingText}</p><span role="status" className="text-xs text-muted">Đang trả lời…</span></article> : <p role="status" className="px-3 py-2 text-muted">R2W AI đang trả lời…</p>)}
    </div>}
    {error && <div className="mb-3"><p role="alert" className="auth-error">{error}</p>{failedRequest && <button type="button" className="reference-link mt-2" disabled={pending} onClick={() => void requestReply(failedRequest, true)}>Thử gửi lại</button>}</div>}
    <form ref={form} method="post" className="d-ai-input-row" onSubmit={send}>
      <textarea className="d-ai-input resize-y" style={{ minHeight: 72, maxHeight: 180 }} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!pending) form.current?.requestSubmit(); } }} maxLength={ASSISTANT_MAX_USER_TEXT} disabled={pending} placeholder="Hỏi về cách dùng Ready2Work hoặc cách luyện tập…" aria-label="Tin nhắn cho R2W AI" rows={2}/>
      <button className="d-ai-send disabled:opacity-50" type="submit" aria-label="Gửi tin nhắn" disabled={pending || !draft.trim()}><svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M2 21 23 12 2 3v7l15 2-15 2z"/></svg></button>
    </form>
    <p className="mt-2 text-right text-xs text-muted">{draft.length.toLocaleString("vi-VN")}/2.000 · Enter để gửi, Shift+Enter để xuống dòng</p>
  </section>;
}
