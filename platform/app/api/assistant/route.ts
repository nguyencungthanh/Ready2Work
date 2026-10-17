import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { generateChatReply } from "@/lib/ai/gemini";
import { DASHBOARD_ASSISTANT_CONTEXT } from "@/lib/assistant/context";
import { ASSISTANT_MAX_BODY_BYTES, ASSISTANT_MAX_HISTORY_TEXT, ASSISTANT_MAX_MESSAGES, ASSISTANT_MAX_REPLY_TEXT, ASSISTANT_MAX_USER_TEXT } from "@/lib/assistant/limits";

export const runtime = "nodejs";
export const maxDuration = 45;
const schema = z.object({ messages: z.array(z.object({ role: z.enum(["user", "model"]), text: z.string().trim().min(1) }).strict()).min(1) }).strict();
const headers = { "Cache-Control": "no-store", Vary: "Cookie" };
const fail = (status: number, code: string, error: string) => NextResponse.json({ error, code }, { status, headers });
class BodyTooLarge extends Error {}

async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > ASSISTANT_MAX_BODY_BYTES) throw new BodyTooLarge();
  if (!request.body) throw new Error("Missing body");
  const reader = request.body.getReader(); const decoder = new TextDecoder();
  let size = 0; let text = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > ASSISTANT_MAX_BODY_BYTES) { await reader.cancel(); throw new BodyTooLarge(); }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail(403, "ORIGIN_NOT_ALLOWED", "Yêu cầu không hợp lệ. Vui lòng gửi tin nhắn từ Ready2Work.");
  let user;
  try { user = await getSessionUser(); }
  catch { return fail(503, "AI_UNAVAILABLE", "Chưa xác minh được phiên đăng nhập. Vui lòng thử lại sau."); }
  if (!user) return fail(401, "AUTH_REQUIRED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để trò chuyện.");
  if (user.accountStatus === "suspended" || user.accountStatus === "deleted") return fail(403, "ACCOUNT_UNAVAILABLE", "Tài khoản hiện chưa thể sử dụng trợ lý AI.");
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return fail(400, "INVALID_REQUEST", "Tin nhắn chưa hợp lệ. Vui lòng kiểm tra và gửi lại.");
  let body: unknown;
  try { body = await readBody(request); }
  catch (error) { return error instanceof BodyTooLarge ? fail(413, "INPUT_TOO_LARGE", "Tin nhắn hoặc hội thoại quá dài. Hãy rút gọn trước khi gửi.") : fail(400, "INVALID_REQUEST", "Tin nhắn chưa hợp lệ. Vui lòng kiểm tra và gửi lại."); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(400, "INVALID_REQUEST", "Tin nhắn chưa hợp lệ. Vui lòng kiểm tra và gửi lại.");
  const messages = parsed.data.messages;
  if (messages.length > ASSISTANT_MAX_MESSAGES || messages.some((turn) => turn.text.length > (turn.role === "user" ? ASSISTANT_MAX_USER_TEXT : ASSISTANT_MAX_REPLY_TEXT)) || messages.reduce((size, turn) => size + turn.text.length, 0) > ASSISTANT_MAX_HISTORY_TEXT) {
    return fail(413, "INPUT_TOO_LARGE", "Tin nhắn hoặc hội thoại quá dài. Hãy rút gọn trước khi gửi.");
  }
  if (messages.length % 2 === 0 || messages.some((turn, index) => turn.role !== (index % 2 === 0 ? "user" : "model"))) return fail(400, "INVALID_REQUEST", "Hội thoại chưa hợp lệ. Hãy gửi lại câu hỏi của bạn.");
  if (!process.env.GEMINI_API_KEY) return fail(503, "AI_UNAVAILABLE", "Trợ lý AI chưa sẵn sàng lúc này. Vui lòng thử lại sau.");
  try {
    const raw = await generateChatReply(DASHBOARD_ASSISTANT_CONTEXT, messages, { maxOutputTokens: 1_200 });
    const reply = z.string().trim().min(1).max(ASSISTANT_MAX_REPLY_TEXT).parse(raw);
    return NextResponse.json({ reply }, { headers });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
    if (status === 429) return fail(429, "AI_RATE_LIMITED", "AI đang nhận quá nhiều yêu cầu. Tin nhắn vẫn được giữ; hãy đợi một lúc rồi thử lại.");
    if (status === 503 || status === 504) return fail(503, "AI_UNAVAILABLE", "Dịch vụ AI tạm thời chưa phản hồi. Tin nhắn vẫn được giữ; vui lòng thử lại.");
    return fail(502, "AI_FAILED", "Chưa nhận được phản hồi từ AI. Tin nhắn vẫn được giữ; vui lòng thử lại.");
  }
}
