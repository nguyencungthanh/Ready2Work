"use client";

import { useActionState } from "react";
import { submitInterviewAnswerAction } from "../../actions";

/** Server validation preserves the answer text on scoring or persistence errors. */
export function AnswerForm({
  sessionId,
  questionId,
}: {
  sessionId: string;
  questionId: string;
}) {
  const [state, action, pending] = useActionState(submitInterviewAnswerAction, {});

  return (
    <form
      className="mt-6 space-y-4"
      action={action}
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="questionId" value={questionId} />
      <textarea
        name="answerText"
        required
        minLength={1}
        maxLength={20000}
        rows={8}
        placeholder="Type your answer..."
        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-200"
      />
      {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 transition-all duration-300"
      >
        {pending ? "Đang đánh giá và lưu…" : "Next Question"}
      </button>
    </form>
  );
}
