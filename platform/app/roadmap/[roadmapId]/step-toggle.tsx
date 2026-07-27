"use client";

import { useState, useTransition } from "react";
import { toggleStepAction } from "../actions";

export function StepToggle({
  stepId,
  initialCompleted,
}: {
  stepId: string;
  initialCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      checked={completed}
      disabled={pending}
      aria-label="Mark step complete"
      onChange={() =>
        startTransition(async () => {
          const next = !completed;
          setCompleted(next);
          await toggleStepAction(stepId, next);
        })
      }
      className="mt-1 h-4 w-4 shrink-0 cursor-pointer"
    />
  );
}
