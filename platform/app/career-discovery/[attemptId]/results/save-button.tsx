"use client";

import { useState, useTransition } from "react";
import { toggleSaveRecommendationAction } from "../../actions";

export function SaveResultButton({
  recommendationId,
  initialSaved,
}: {
  recommendationId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = !saved;
          await toggleSaveRecommendationAction(recommendationId, next);
          setSaved(next);
        })
      }
      className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
    >
      {saved ? "Saved ✓" : "Save Result"}
    </button>
  );
}
