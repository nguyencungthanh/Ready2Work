"use client";

import { useActionState } from "react";
import {
  applyForRoleAction,
  exportMyDataAction,
  requestAccountDeletionAction,
} from "./actions";
import type { FormState } from "../(auth)/actions";

interface Application {
  id: string;
  requested_role: string;
  status: string;
  created_at: string;
}

export function AccountPanels({ applications }: { applications: Application[] }) {
  const [applyState, applyAction, applying] = useActionState(applyForRoleAction, {});
  const [exportState, exportAction, exporting] = useActionState(
    async (): Promise<FormState> => exportMyDataAction(),
    {},
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    async (): Promise<FormState> => requestAccountDeletionAction(),
    {},
  );

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-medium text-gray-900">Apply for a role</h2>
        <p className="mt-1 text-sm text-gray-600">
          Mentor and employer access requires admin approval.
        </p>

        {applications.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-gray-700">
            {applications.map((application) => (
              <li key={application.id}>
                {application.requested_role}: <strong>{application.status}</strong>
              </li>
            ))}
          </ul>
        )}

        <form action={applyAction} className="mt-4 space-y-3">
          {applyState.error && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{applyState.error}</p>
          )}
          {applyState.success && (
            <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
              {applyState.success}
            </p>
          )}

          <div>
            <label htmlFor="requestedRole" className="block text-sm font-medium text-gray-800">
              Role
            </label>
            <select
              id="requestedRole"
              name="requestedRole"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="mentor">Mentor</option>
              <option value="employer_member">Employer</option>
            </select>
          </div>

          <div>
            <label htmlFor="justification" className="block text-sm font-medium text-gray-800">
              Why are you a good fit?
            </label>
            <textarea
              id="justification"
              name="justification"
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {applyState.fieldErrors?.justification && (
              <p className="mt-1 text-sm text-red-700">{applyState.fieldErrors.justification}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={applying}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
          >
            {applying ? "Submitting…" : "Submit application"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-medium text-gray-900">Your data</h2>
        <form action={exportAction} className="mt-3">
          <button
            type="submit"
            disabled={exporting}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
          >
            {exporting ? "Preparing…" : "Export my data"}
          </button>
        </form>
        {exportState.success && (
          <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800">
            {exportState.success}
          </pre>
        )}
      </section>

      <section className="rounded-lg border border-red-200 p-5">
        <h2 className="text-lg font-medium text-gray-900">Delete account</h2>
        <p className="mt-1 text-sm text-gray-600">
          This signs you out and schedules your data for removal.
        </p>
        {deleteState.error && (
          <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{deleteState.error}</p>
        )}
        <form action={deleteAction} className="mt-3">
          <button
            type="submit"
            disabled={deleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? "Working…" : "Request deletion"}
          </button>
        </form>
      </section>
    </div>
  );
}
