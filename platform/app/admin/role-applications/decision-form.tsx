"use client";

import { useActionState } from "react";
import { decideRoleApplicationAction } from "../actions";

export function ApplicationDecisionForm({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState(decideRoleApplicationAction, {});

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />

      {state.error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {state.success}
        </p>
      )}

      <label htmlFor={`notes-${applicationId}`} className="sr-only">
        Review notes
      </label>
      <input
        id={`notes-${applicationId}`}
        name="notes"
        placeholder="Review notes (optional)"
        className="w-full rounded-md border border-border px-3 py-2 text-sm"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 transition-colors duration-200"
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-60 transition-colors duration-200"
        >
          Reject
        </button>
      </div>
    </form>
  );
}
