"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MarkdownMessage } from "@/components/markdown-message";
import { sendRoadmapChatMessageAction, type ChatFormState } from "../actions";

export interface RoadmapChatMessageProps {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function RoadmapChat({
  roadmapId,
  messages,
}: {
  roadmapId: string;
  messages: RoadmapChatMessageProps[];
}) {
  const action = sendRoadmapChatMessageAction.bind(null, roadmapId);
  const [state, formAction, pending] = useActionState<ChatFormState, FormData>(action, {});
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      {open && (
        <aside
          id="roadmap-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="roadmap-chat-title"
          className="fixed bottom-24 right-4 z-50 flex max-h-[min(42rem,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:right-6"
        >
          <header className="flex items-start justify-between gap-4 border-b border-border bg-surface px-5 py-4">
            <div>
              <h2 id="roadmap-chat-title" className="font-semibold text-foreground">
                Ask Ready2Work
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Ask about a step or how to adjust your roadmap.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Ready2Work chat"
              className="rounded-md p-1 text-muted transition-colors hover:bg-background hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-xl bg-surface p-4 text-sm text-muted">
                Ask why a step matters, what to do first, or how to adapt your roadmap.
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`break-words rounded-xl px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto max-w-[85%] whitespace-pre-wrap bg-primary text-white"
                    : "max-w-[92%] bg-surface text-foreground"
                }`}
              >
                {message.role === "assistant" ? (
                  <MarkdownMessage>{message.content}</MarkdownMessage>
                ) : (
                  message.content
                )}
              </div>
            ))}
            {pending && (
              <div className="max-w-[92%] rounded-xl bg-surface px-3 py-2 text-sm text-muted">
                Ready2Work is thinking…
              </div>
            )}
          </div>

          <div className="border-t border-border bg-background p-4">
            {state.error && (
              <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {state.error}
              </p>
            )}
            <form
              ref={formRef}
              action={async (formData) => {
                await formAction(formData);
                formRef.current?.reset();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                name="message"
                required
                rows={2}
                maxLength={2_000}
                placeholder="Ask about your roadmap…"
                className="max-h-32 min-h-11 flex-1 resize-y rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={pending}
                className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-white transition-all hover:bg-primary-hover disabled:opacity-60"
              >
                {pending ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </aside>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="roadmap-chat-panel"
        aria-label={open ? "Close Ready2Work chat" : "Open Ready2Work chat"}
        className="fixed bottom-6 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-primary-hover hover:shadow-2xl sm:right-6"
      >
        {open ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path
              d="M6 6l12 12M18 6 6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path
              d="M5 5h14v10H9l-4 4V5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {open ? "Close" : "Ask Ready2Work"}
      </button>
    </>
  );
}
