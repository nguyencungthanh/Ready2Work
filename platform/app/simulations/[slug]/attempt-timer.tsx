"use client";
import { formatPracticeTime } from "@/lib/practice-time";

export function AttemptTimer({ seconds, compact = false }: { seconds: number | null; compact?: boolean }) {
  const text = seconds === null ? "—:—" : formatPracticeTime(seconds);
  if (compact) return <div className="timer-box" aria-label="Thời gian còn lại"><span aria-hidden="true">◷</span><span>{text}</span>{seconds === 0 && <small>Đã hết giờ</small>}</div>;
  return <div className="mb-5 rounded-xl bg-teal-50 p-4 text-sm text-teal-900"><p className="font-semibold">Thời gian còn lại: {text} / 60 phút</p><p>Hết giờ, bài làm sẽ khóa. Tải lại hoặc rời trang không đặt lại đồng hồ.</p></div>;
}
