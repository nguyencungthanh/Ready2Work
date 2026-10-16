"use client";
import { useCallback, useState } from "react";
import { CVForm } from "./cv-form";
import { CVResults, type SavedCV } from "./cv-results";
export function CVWorkspace({ positions,analyses }: { positions:{id:string;title:string;industry:string}[];analyses:SavedCV[] }) {
 const [view,setView]=useState(analyses.length?"result":"setup");const [selected,setSelected]=useState(analyses[0]?.id);const complete=useCallback(()=>{setView("result");setSelected(undefined)},[]);const current=analyses.find(a=>a.id===selected)||analyses[0];
 return <>{view==="result"&&current?<CVResults analysis={current} onReset={()=>setView("setup")}/>:<CVForm positions={positions} onComplete={complete}/>}<details className="mt-6"><summary className="text-sm font-semibold text-muted cursor-pointer">Phân tích đã lưu ({analyses.length})</summary><div className="rm-result-tabs mt-4"><button aria-pressed={view==="setup"} onClick={()=>setView("setup")}>Phân tích CV mới</button>{analyses.map(a=><button key={a.id} aria-pressed={view==="result"&&current?.id===a.id} onClick={()=>{setSelected(a.id);setView("result")}}>{a.position_title} · {new Date(a.created_at).toLocaleDateString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</button>)}</div></details></>;
}
