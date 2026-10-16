"use client";
import { useEffect, useState } from "react";

export function AttemptTimer({ startedAt, minutes, compact=false }: { startedAt: string; minutes: number;compact?:boolean }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  const exceeded = seconds !== null && seconds > minutes * 60;
  if(compact){const remaining=seconds===null?null:Math.max(0,minutes*60-seconds);return <div className="timer-box" aria-live="off"><span aria-hidden="true">◷</span><span>{remaining===null?"—:—":`${String(Math.floor(remaining/3600)).padStart(2,"0")}:${String(Math.floor(remaining/60)%60).padStart(2,"0")}:${String(remaining%60).padStart(2,"0")}`}</span>{exceeded&&<small>Đã quá thời gian dự kiến</small>}</div>}
  return <div className={`mb-5 rounded-xl p-4 text-sm ${exceeded ? "bg-amber-50 text-amber-900" : "bg-teal-50 text-teal-900"}`}><p className="font-semibold">Thời gian làm bài: {seconds === null ? "Đang tính…" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`} / {minutes} phút</p><p className="mt-1 text-xs leading-5">{exceeded ? "Bạn vẫn có thể gửi bài. Phần điểm về thời gian sẽ áp dụng theo quy tắc của nhiệm vụ." : "Thời gian bắt đầu được lưu trên máy chủ và tiếp tục chạy khi bạn rời trang."}</p></div>;
}
