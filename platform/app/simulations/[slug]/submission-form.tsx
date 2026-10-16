"use client";

import { useActionState } from "react";
import { submitSimulationAction, type FormState } from "../actions";

export function SubmissionForm({ simulationId, attemptId }: { simulationId: string; attemptId: string }) {
  const action = submitSimulationAction.bind(null, simulationId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="attemptId" value={attemptId} />
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label htmlFor="content" className="block text-sm font-medium text-foreground">
        Your submission · Nội dung bài làm
      </label>
      <textarea
        id="content"
        name="content"
        rows={14}
        required
        maxLength={50000}
        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 transition-all duration-300"
      >
        {pending ? "Đang chấm điểm và lưu kết quả…" : "Submit"}
      </button>
    </form>
  );
}
