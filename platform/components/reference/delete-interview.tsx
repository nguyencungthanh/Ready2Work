"use client";
import { useActionState } from "react";
import { deleteInterviewSessionAction } from "@/app/interviews/actions";

export function DeleteInterview({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(async (previous: { error?: string }, data: FormData) => {
    const result = await deleteInterviewSessionAction(previous, data);
    if (!result.error) {
      try {
        const prefix = `r2w:answer:${sessionId}:`;
        for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix)) sessionStorage.removeItem(key);
      } catch { /* Storage may be disabled; server deletion has still completed. */ }
    }
    return result;
  }, {});
  return <form action={action} onSubmit={event => { if (!window.confirm("Xóa buổi phỏng vấn và các câu trả lời đã lưu? Thao tác này không thể hoàn tác.")) event.preventDefault(); }}>
    <input type="hidden" name="sessionId" value={sessionId}/>
    <button type="submit" disabled={pending} className="text-xs text-red-700 underline disabled:opacity-50" aria-label="Xóa buổi phỏng vấn">{pending ? "Đang xóa…" : "Xóa"}</button>
    {state.error && <p role="alert" className="auth-error">{state.error}</p>}
  </form>;
}
