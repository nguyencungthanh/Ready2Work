"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ReferenceIcon } from "./icon";
export function Modal({ title, children, onClose, wide=false, full=false, subtitle }: { title:string; children:ReactNode; onClose:()=>void; wide?:boolean;full?:boolean;subtitle?:string }) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
 return <dialog ref={ref} aria-label={title} className={`r2w-modal ${wide?"r2w-modal-wide":""} ${full?"r2w-modal-full":""}`} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><header><div>{full&&<p className="iv-head-kicker">READY2WORK · B2B</p>}<h2>{title}</h2>{subtitle&&<p className="r2w-modal-subtitle">{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Đóng">×</button></header>{children}</dialog>;
}
export function PendingPanel({ title="Đang xử lý", steps=["Đọc nội dung của bạn","Đối chiếu với tiêu chí","Đánh giá và lưu kết quả"] }: { title?:string; steps?:string[] }) {
 return <div className="r2w-processing" role="status" aria-live="polite"><div className="iv-processing-card"><div className="iv-proc-brand"><span className="iv-brand-logo-text">Ready<span>2</span>Work</span></div><div className="iv-proc-icon-wrap"><ReferenceIcon name="document" size={64}/></div><h2 className="iv-proc-title">{title}</h2><span className="iv-proc-badge">Đang chờ kết quả</span><p className="iv-proc-sub">Vui lòng giữ trang mở. Kết quả sẽ hiển thị sau khi xử lý hoàn tất.</p><div className="r2w-processing-steps">{steps.map((s,i)=><div key={s}><span>{i+1}</span><p>{s}</p></div>)}</div><div className="r2w-indeterminate"/></div></div>;
}
export function Radar({ values }: { values:{label:string;score:number}[] }) {
 const points=values.slice(0,6);if(points.length<3)return <p className="r2w-empty">Chưa có đủ ba nhóm tiêu chí để vẽ biểu đồ.</p>;
 const point=(i:number,r:number)=>{const a=-Math.PI/2+i*2*Math.PI/points.length;return [150+Math.cos(a)*r,125+Math.sin(a)*r]};
 return <div><svg viewBox="0 0 300 260" className="r2w-radar" role="img" aria-label="Biểu đồ điểm thực tế">{[25,50,75,100].map(r=><polygon key={r} points={points.map((_,i)=>point(i,r).join(",")).join(" ")} fill="none" stroke="#e2e8f0"/>)}{points.map((_,i)=><line key={i} x1="150" y1="125" x2={point(i,100)[0]} y2={point(i,100)[1]} stroke="#e2e8f0"/>)}<polygon points={points.map((v,i)=>point(i,Math.max(0,Math.min(100,v.score))).join(",")).join(" ")} fill="#0ebfb830" stroke="#0ebfb8" strokeWidth="2"/>{points.map((v,i)=><text key={v.label} x={point(i,116)[0]} y={point(i,116)[1]} textAnchor="middle" fontSize="11" fill="#64748b">{i+1}</text>)}</svg><ol className="r2w-radar-legend">{points.map((v,i)=><li key={v.label}>{i+1}. {v.label}<strong>{Math.round(v.score)}/100</strong></li>)}</ol></div>;
}
export function ScoreRing({ score }: { score:number|null }) { return <div className="iv-score-ring-wrap"><svg width="140" height="140" viewBox="0 0 140 140"><circle cx="70" cy="70" r="56" fill="none" stroke="#e2e8f0" strokeWidth="12"/><circle cx="70" cy="70" r="56" fill="none" stroke="#0ebfb8" strokeWidth="12" strokeDasharray="351.86" strokeDashoffset={351.86*(1-(score??0)/100)} strokeLinecap="round" transform="rotate(-90 70 70)"/></svg><div className="iv-score-center-text">{score??"—"}<small>/100</small></div></div> }
