"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { submitInterviewAnswerAction } from "../../actions";

/**
 * Submits an answer, then explicitly refreshes the route.
 *
 * A plain <form action={serverAction}> on this page was found (via manual
 * testing) to sometimes re-render with a stale Router Cache entry for the
 * current URL - the DB write succeeds but the same question stays on
 * screen. router.refresh() forces Next to discard that cache and refetch
 * the Server Component tree, which reliably shows the next question.
 */
export function AnswerForm({
  sessionId,
  questionId,
}: {
  sessionId: string;
  questionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          await submitInterviewAnswerAction(formData);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="questionId" value={questionId} />
      <textarea
        name="answerText"
        required
        minLength={1}
        rows={8}
        placeholder="Type your answer..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Next Question"}
      </button>
    </form>
  );
}
