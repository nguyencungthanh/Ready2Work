"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MarkdownMessage } from "@/components/markdown-message";
import {
  generateRoadmapFromFormAction,
  sendPlanningChatMessageAction,
  type PlanningChatFormState,
} from "../actions";

interface CareerOption {
  id: string;
  title: string;
  industry: string;
}

function PlanningChat({ careerId, onClose }: { careerId: string; onClose: () => void }) {
  const initialState: PlanningChatFormState = { messages: [] };
  const [state, formAction, pending] = useActionState(
    sendPlanningChatMessageAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.messages]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <aside
      id="planning-chat"
      role="dialog"
      aria-modal="false"
      aria-labelledby="planning-chat-title"
      className="fixed bottom-24 right-4 z-50 flex max-h-[min(42rem,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:right-6"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border bg-surface px-5 py-4">
        <div>
          <h2 id="planning-chat-title" className="font-semibold text-foreground">
            Ask Ready2Work
          </h2>
          <p className="mt-1 text-xs text-muted">
            Uses your selected career as context. This preview conversation is not saved.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
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
        {state.messages.length === 0 && (
          <div className="rounded-xl bg-surface p-4 text-sm text-muted">
            Try asking: “What should I learn first?” or “Is this career suitable for an accounting
            student?”
          </div>
        )}
        {state.messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
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
          <input type="hidden" name="careerId" value={careerId} />
          <textarea
            name="message"
            required
            rows={2}
            maxLength={2_000}
            placeholder="Ask about this career…"
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
  );
}

export function RoadmapPlanner({
  careers,
  initialCareerId,
}: {
  careers: CareerOption[];
  initialCareerId: string;
}) {
  const [careerId, setCareerId] = useState(initialCareerId);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <form action={generateRoadmapFromFormAction} className="mt-8 space-y-4">
        <div>
          <label htmlFor="careerId" className="block text-sm font-medium text-foreground">
            Target career
          </label>
          <select
            id="careerId"
            name="careerId"
            value={careerId}
            onChange={(event) => setCareerId(event.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          >
            {careers.map((career) => (
              <option key={career.id} value={career.id}>
                {career.title} — {career.industry}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="submit"
            disabled={!careerId}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md disabled:opacity-60"
          >
            Generate Roadmap
          </button>
        </div>
      </form>

      {chatOpen && (
        <PlanningChat key={careerId} careerId={careerId} onClose={() => setChatOpen(false)} />
      )}

      <button
        type="button"
        disabled={!careerId}
        onClick={() => setChatOpen((current) => !current)}
        aria-expanded={chatOpen}
        aria-controls="planning-chat"
        aria-label={chatOpen ? "Close Ready2Work chat" : "Open Ready2Work chat"}
        className="fixed bottom-6 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-primary-hover hover:shadow-2xl disabled:translate-y-0 disabled:opacity-60 sm:right-6"
      >
        {chatOpen ? (
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
        {chatOpen ? "Close" : "Ask Ready2Work"}
      </button>
    </>
  );
}
