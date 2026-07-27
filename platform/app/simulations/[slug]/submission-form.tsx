"use client";

import { useActionState } from "react";
import { submitSimulationAction, type FormState } from "../actions";

export function SubmissionForm({ simulationId }: { simulationId: string }) {
  const action = submitSimulationAction.bind(null, simulationId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label htmlFor="content" className="block text-sm font-medium text-gray-800">
        Your submission
      </label>
      <textarea
        id="content"
        name="content"
        rows={14}
        required
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
