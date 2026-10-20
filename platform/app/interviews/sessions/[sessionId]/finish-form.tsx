"use client";
import { useFormStatus } from "react-dom";
import { completeInterviewSessionAction } from "../../actions";
import { PendingPanel } from "@/components/reference/ui";
export function FinishForm({sessionId}:{sessionId:string}){return <form action={completeInterviewSessionAction}><input type="hidden" name="sessionId" value={sessionId}/><FinishButton/></form>}
function FinishButton(){const{pending}=useFormStatus();return <><button className="iv-hero-cta mt-6" disabled={pending}>{pending?"Đang tổng hợp báo cáo…":"Kết thúc & Xem báo cáo"}</button>{pending&&<PendingPanel title="R2W AI đang tổng hợp kết quả phỏng vấn của bạn" steps={["Kiểm tra câu trả lời đã lưu","Tổng hợp điểm của ba vòng","Lưu báo cáo đánh giá"]}/>}</>}
