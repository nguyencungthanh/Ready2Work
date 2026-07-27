"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

interface Field {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}

interface AuthFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  checkbox?: { name: string; label: string };
  hidden?: Record<string, string>;
}

export function AuthForm({ action, fields, submitLabel, checkbox, hidden }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {hidden &&
        Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {state.success}
        </p>
      )}

      {fields.map((field) => {
        const errorId = `${field.name}-error`;
        const fieldError = state.fieldErrors?.[field.name];
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-800">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              required={field.required ?? true}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? errorId : undefined}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            {fieldError && (
              <p id={errorId} className="mt-1 text-sm text-red-700">
                {fieldError}
              </p>
            )}
          </div>
        );
      })}

      {checkbox && (
        <div>
          <label htmlFor={checkbox.name} className="flex items-start gap-2 text-sm text-gray-800">
            <input
              id={checkbox.name}
              name={checkbox.name}
              type="checkbox"
              aria-describedby={
                state.fieldErrors?.[checkbox.name] ? `${checkbox.name}-error` : undefined
              }
              className="mt-1"
            />
            <span>{checkbox.label}</span>
          </label>
          {state.fieldErrors?.[checkbox.name] && (
            <p id={`${checkbox.name}-error`} className="mt-1 text-sm text-red-700">
              {state.fieldErrors[checkbox.name]}
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
      >
        {pending ? "Working…" : submitLabel}
      </button>
    </form>
  );
}
