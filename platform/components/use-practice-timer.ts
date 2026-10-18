"use client";
import { useEffect, useState } from "react";
import { practiceDeadline, practiceRemaining } from "@/lib/practice-time";

/** Reconcile with the timestamp on focus; never restart an hour on reload. */
export function usePracticeTimer(startedAt: string, enabled = true) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      const remaining = practiceRemaining(startedAt);
      setSeconds(remaining);
      if (remaining === 0 && timer) { clearInterval(timer); timer = undefined; }
    };
    update();
    if (practiceRemaining(startedAt) > 0) timer = setInterval(update, 1000);
    const deadline = practiceDeadline(startedAt);
    const expiry = Number.isFinite(deadline) ? setTimeout(update, Math.max(0, deadline-Date.now())) : undefined;
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { if (timer) clearInterval(timer); if (expiry) clearTimeout(expiry); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, [startedAt, enabled]);
  return { seconds: enabled ? seconds : null, expired: enabled && seconds === 0 };
}
