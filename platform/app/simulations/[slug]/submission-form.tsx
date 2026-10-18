"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { readSimulationUploadAction, submitSimulationAction, type FormState } from "../actions";
import { AttemptTimer } from "./attempt-timer";
import { usePracticeTimer } from "@/components/use-practice-timer";
import { practiceExpired } from "@/lib/practice-time";
import { PendingPanel } from "@/components/reference/ui";
import { ReferenceIcon } from "@/components/reference/icon";
import { useSessionValue } from "@/components/reference/storage";
import { MarkdownMessage } from "@/components/markdown-message";
import { ReferenceMaterials } from "./reference-materials";
import { serializeSubmissionTable, type SimulationMaterial } from "@/lib/simulation/materials";

type AnswerTable = { id:string; title:string; columns:string[]; rows:string[][]; fixedRows?:string[][] };
function sourceTables(materials:SimulationMaterial[]):AnswerTable[] {
 return materials.filter(m=>m.kind==="table"&&m.editable&&m.columns&&m.rows).map(m=>({id:m.id,title:m.title,columns:m.columns!,rows:m.rows!.map(r=>[...r]),fixedRows:m.rows}));
}

function parseDraft(value:string|null):{text:string;tables?:AnswerTable[]}|null{
 if(!value)return null;
 try{const saved=JSON.parse(value);if(saved.version===2&&typeof saved.text==="string"&&Array.isArray(saved.tables)&&saved.tables.every((t:AnswerTable)=>typeof t.id==="string"&&typeof t.title==="string"&&Array.isArray(t.columns)&&t.columns.every(c=>typeof c==="string")&&Array.isArray(t.rows)&&t.rows.every(r=>Array.isArray(r)&&r.every(c=>typeof c==="string"))))return saved}catch{}
 return{text:value};
}
export function SubmissionForm({simulationId,attemptId,startedAt,title,industry,instructions,materials=[],canSubmit=true,unavailableReason}:{simulationId:string;attemptId:string;startedAt:string;minutes:number;title:string;industry:string;instructions:string;materials?:SimulationMaterial[];canSubmit?:boolean;unavailableReason?:string|null;timeLimitSpecified?:boolean}) {
 const [state,action,pending]=useActionState<FormState,FormData>(submitSimulationAction.bind(null,simulationId),{});
 const {seconds,expired}=usePracticeTimer(startedAt,canSubmit);
 const [tab,setTab]=useState("task");const [editedText,setText]=useState<string|null>(null);const [editedTables,setTables]=useState<AnswerTable[]|null>(null);
 const [uploading,setUploading]=useState(false);const [uploadError,setUploadError]=useState("");const [uploadedName,setUploadedName]=useState("");
 const editor=useRef<HTMLDivElement>(null);const fileInput=useRef<HTMLInputElement>(null);const draftKey="r2w:attempt:"+attemptId;
 const stored=useSessionValue(draftKey);const saved=parseDraft(stored);const text=editedText??saved?.text??"";const tables=editedTables??saved?.tables??sourceTables(materials);
 const answer=[text.trim(),...tables.filter(t=>t.rows.some((r,ri)=>r.some((c,ci)=>c.trim()&&!t.fixedRows?.[ri]?.[ci]))).map(t=>serializeSubmissionTable(t.title,t.columns,t.rows))].filter(Boolean).join("\n\n");
 useEffect(()=>{if(editor.current&&editor.current.innerText!==text)editor.current.innerText=text},[text]);
 function saveDraft(nextText:string,nextTables=tables){if(canSubmit&&practiceExpired(startedAt))return;setText(nextText);sessionStorage.setItem(draftKey,JSON.stringify({version:2,text:nextText,tables:nextTables}))}
 function updateTables(next:AnswerTable[]){setTables(next);saveDraft(text,next)}
 function format(command:string){editor.current?.focus();document.execCommand(command,false);if(editor.current)saveDraft(editor.current.innerText)}
 async function upload(file:File){if(canSubmit&&practiceExpired(startedAt))return;setUploading(true);setUploadError("");const data=new FormData();data.set("file",file);try{const result=await readSimulationUploadAction(data);if(canSubmit&&practiceExpired(startedAt))return;if(result.error||!result.text){setUploadError(result.error||"Chưa đọc được tài liệu.");return}const next=[text,result.text].filter(Boolean).join("\n\n");if(next.length>50000){setUploadError("Tổng nội dung bài làm vượt quá 50.000 ký tự. Hãy rút gọn trước khi thêm tệp.");return}saveDraft(next);if(editor.current)editor.current.innerText=next;setUploadedName(file.name)}catch{setUploadError("Chưa tải được tài liệu. Nội dung hiện có vẫn được giữ; vui lòng thử lại.")}finally{setUploading(false);if(fileInput.current)fileInput.current.value=""}}
 return <form action={action} id="simulation-submission" onSubmit={e=>{if(canSubmit&&practiceExpired(startedAt))e.preventDefault()}}><input type="hidden" name="attemptId" value={attemptId}/><input type="hidden" name="content" value={answer}/>
  <div className="test-header"><div className="test-badge"><strong>{title}</strong><br/><span>{industry}</span></div>{canSubmit?<AttemptTimer seconds={seconds} compact/>:<span className="text-sm text-muted">Soạn thử · Chưa tính thời gian</span>}<button className="submit-exam-btn" disabled={!canSubmit||expired||pending||uploading||!answer.trim()||answer.length>50000}>{expired?"Đã hết giờ":canSubmit?"Nộp báo cáo":"Chờ xác nhận tiêu chí"}</button></div>
  {expired&&<p role="alert" className="auth-error">Đã hết 60 phút. Lượt làm bài đã dừng, không thể sửa hoặc nộp thêm. Bản nháp vẫn được giữ trên trình duyệt.</p>}
  {!canSubmit&&<p role="status" className="auth-error">{unavailableReason||"Tiêu chí chấm điểm đang chờ xác nhận theo tài liệu gốc."} Bạn vẫn có thể đọc tài liệu và soạn thử; bài nháp được giữ trên trình duyệt.</p>}{answer.length>50000&&<p role="alert" className="auth-error">Bài làm tối đa 50.000 ký tự. Vui lòng rút gọn trước khi nộp.</p>}{state.error&&<p role="alert" className="auth-error">{state.error}</p>}
  <div className="workspace-split"><section className="left-resource-panel"><div className="panel-tabs"><button type="button" className={`panel-tab ${tab==="task"?"active":""}`} onClick={()=>setTab("task")}>Tab 1 Đề bài</button><button type="button" className={`panel-tab ${tab==="resources"?"active":""}`} onClick={()=>setTab("resources")}>Tab 2 Tài liệu tham khảo</button></div><div className="panel-content">{tab==="task"?<MarkdownMessage>{instructions.split("## Dữ liệu đầu vào")[0] ?? ""}</MarkdownMessage>:materials.length?<ReferenceMaterials materials={materials}/>:<p>Nhiệm vụ này sử dụng thông tin trong đề bài; không có tệp dữ liệu bổ sung.</p>}</div></section>
  <fieldset className="right-editor-panel" disabled={expired||pending||uploading}><div className="editor-toolbar">{[{label:"B",command:"bold",title:"In đậm"},{label:"I",command:"italic",title:"In nghiêng"},{label:"U",command:"underline",title:"Gạch chân"},{label:"Danh sách",command:"insertUnorderedList",title:"Danh sách"}].map(t=><button type="button" key={t.command} className="tool-btn" aria-label={t.title} onMouseDown={e=>e.preventDefault()} onClick={()=>format(t.command)}>{t.label}</button>)}<button type="button" className="tool-btn" disabled={pending} onClick={()=>updateTables([...tables,{id:`custom-${Date.now()}`,title:`Bảng ${tables.length+1}`,columns:["Chỉ tiêu","Kết quả"],rows:[["",""],["",""]]}])}>Thêm bảng</button></div>
  <div className="submission-body">
  <div ref={editor} role="textbox" aria-label="Nội dung bài làm" aria-multiline="true" contentEditable={!expired&&!pending&&!uploading} suppressContentEditableWarning className="editor-textarea" data-placeholder="Trình soạn thảo văn bản: Trình bày phân tích, kết quả và đề xuất của bạn…" onInput={e=>saveDraft(e.currentTarget.innerText)}/>
  {tables.map((table,ti)=><section key={table.id} className="mx-4 mb-4 rounded border border-border p-3"><h2 className="font-bold mb-3">{table.title}</h2><div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{table.columns.map((c,i)=><th key={i} className="border border-border p-2 text-left">{c}</th>)}</tr></thead><tbody>{table.rows.map((row,r)=><tr key={r}>{row.map((cell,c)=><td key={c} className="border border-border p-1">{table.fixedRows?.[r]?.[c]?<span className="block p-1 whitespace-pre-wrap">{cell}</span>:<textarea aria-label={`${table.title}, hàng ${r+1}, ${table.columns[c]}`} value={cell} rows={2} disabled={pending} className="w-full min-w-24 resize-y rounded bg-transparent p-1" onChange={e=>updateTables(tables.map((t,i)=>i!==ti?t:{...t,rows:t.rows.map((cells,ri)=>ri!==r?cells:cells.map((v,ci)=>ci===c?e.target.value:v))}))}/>}</td>)}</tr>)}</tbody></table></div>
   {!table.fixedRows&&<div className="flex flex-wrap gap-3 mt-3"><button type="button" className="reference-link" onClick={()=>updateTables(tables.map((t,i)=>i===ti?{...t,rows:[...t.rows,t.columns.map(()=>"")]}:t))}>Thêm hàng</button><button type="button" className="reference-link" onClick={()=>updateTables(tables.map((t,i)=>i===ti?{...t,columns:[...t.columns,`Cột ${t.columns.length+1}`],rows:t.rows.map(r=>[...r,""])}:t))}>Thêm cột</button><button type="button" className="reference-link" onClick={()=>updateTables(tables.filter((_,i)=>i!==ti))}>Xóa bảng</button></div>}
  </section>)}
  </div><div className="upload-zone"><input ref={fileInput} type="file" accept=".pdf,.docx,.txt,.csv" className="sr-only" aria-label="Tài liệu bài làm" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/><button type="button" disabled={pending||uploading} className="upload-btn" onClick={()=>fileInput.current?.click()}><ReferenceIcon name="upload" size={14}/>{uploading?"Đang đọc tài liệu…":"Tải tài liệu bài làm"}</button><p className="text-xs text-muted">PDF có văn bản, DOCX, TXT hoặc CSV, tối đa 3 MB. Văn bản được đưa vào bài làm để bạn kiểm tra trước khi nộp.</p>{uploadedName&&<p className="text-xs" role="status">Đã đọc: {uploadedName}</p>}{uploadError&&<p role="alert" className="auth-error">{uploadError}</p>}<span className="text-xs text-muted">{answer.length.toLocaleString("vi-VN")} / 50.000 ký tự</span></div>
  </fieldset></div>{pending&&<PendingPanel title="AI đang đánh giá độ chính xác…" steps={["Phân tích lập luận","Đối chiếu với tiêu chí nhiệm vụ","Lưu điểm và tổng hợp báo cáo"]}/>}</form>;
}
