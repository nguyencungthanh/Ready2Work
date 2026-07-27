"use client";

import { useActionState, useRef } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="mt-10 rounded-lg border border-border bg-surface p-5">
      <h2 className="text-lg font-medium text-foreground">Ask about your roadmap</h2>
      <p className="mt-1 text-sm text-muted">
        Ask why a step is there, what to do first, or how to adjust the plan.
      </p>

      <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-muted">No messages yet. Ask a question to get started.</p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg px-3 py-2 text-sm ${
              message.role === "user"
                ? "ml-auto max-w-[85%] bg-primary text-white"
                : "max-w-[85%] bg-navy-700 text-foreground"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      {state.error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="mt-4 flex gap-2"
      >
        <input
          type="text"
          name="message"
          required
          placeholder="Ask a question…"
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}
