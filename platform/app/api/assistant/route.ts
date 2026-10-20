import { hasAIKey } from "@/lib/ai/config";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { generateChatReply } from "@/lib/ai/gemini";
import { streamChatReply } from "@/lib/ai/chat-stream";
import { logger } from "@/lib/observability/logger";
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
  if (user.accountStatus === "suspended" || user.accountStatus === "deleted") return fail(403, "ACCOUNT_UNAVAILABLE", "Tài khoản hiện chưa thể trò chuyện với R2W AI.");
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
  if (!hasAIKey()) return fail(503, "AI_UNAVAILABLE", "Mình chưa sẵn sàng trả lời lúc này. Bạn thử lại sau nhé.");
  try {
    if (request.headers.get("accept")?.includes("application/x-ndjson")) {
      const started = Date.now();
      const abort = new AbortController();
      const iterator = streamChatReply(DASHBOARD_ASSISTANT_CONTEXT, messages, AbortSignal.any([request.signal, abort.signal]));
      // Wait for the first token so authentication/quota failures retain their
      // normal HTTP status, then deliver text while the provider is generating.
      const first = await iterator.next();
      if (first.done || !first.value) throw new Error("Empty AI stream");
      logger.info("assistant_first_text", { route: "/api/assistant", duration_ms: Date.now() - started });
      const encoder = new TextEncoder();
      let initial = true;
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const next = initial ? first : await iterator.next();
            initial = false;
            controller.enqueue(encoder.encode(JSON.stringify(next.done ? { done: true } : { delta: next.value }) + "\n"));
            if (next.done) {
              logger.info("assistant_completed", { route: "/api/assistant", duration_ms: Date.now() - started });
              controller.close();
            }
          } catch {
            if (abort.signal.aborted || request.signal.aborted) return;
            controller.enqueue(encoder.encode(JSON.stringify({ error: "Mình chưa hoàn tất câu trả lời. Tin nhắn của bạn vẫn được giữ; bạn thử lại nhé." }) + "\n"));
            controller.close();
          }
        },
        async cancel() { abort.abort(); await iterator.return(undefined); },
      });
      return new Response(body, { headers: { ...headers, "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" } });
    }
    const raw = await generateChatReply(DASHBOARD_ASSISTANT_CONTEXT, messages, { maxOutputTokens: 1_200 });
    const reply = z.string().trim().min(1).max(ASSISTANT_MAX_REPLY_TEXT).parse(raw);
    return NextResponse.json({ reply }, { headers });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
    if (status === 401 || status === 403) return fail(503, "AI_CONFIGURATION", "Mình tạm thời chưa thể trả lời. Tin nhắn của bạn vẫn được giữ; bạn thử lại sau hoặc liên hệ hỗ trợ nhé.");
    if (status === 429) return fail(429, "AI_RATE_LIMITED", "Mình đang bận xử lý nhiều yêu cầu. Tin nhắn của bạn vẫn được giữ; bạn đợi một chút rồi thử lại nhé.");
    if (status === 503 || status === 504) return fail(503, "AI_UNAVAILABLE", "Mình tạm thời chưa thể trả lời. Tin nhắn của bạn vẫn được giữ; bạn thử lại sau nhé.");
    return fail(502, "AI_FAILED", "Mình chưa hoàn tất câu trả lời. Tin nhắn của bạn vẫn được giữ; bạn thử lại nhé.");
  }
}
