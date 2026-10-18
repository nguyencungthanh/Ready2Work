import { ASSISTANT_MAX_REPLY_TEXT } from "./limits";

/** A partial answer is display-only until the server confirms completion. */
export async function readAssistantReply(body: ReadableStream<Uint8Array>, onText: (text: string) => void): Promise<string> {
  const reader = body.getReader(), decoder = new TextDecoder();
  let pending = "", reply = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = pending.indexOf("\n")) !== -1) {
        const line = pending.slice(0, boundary);
        pending = pending.slice(boundary + 1);
        if (!line.trim()) continue;
        const event: unknown = JSON.parse(line);
        if (!event || typeof event !== "object") throw new Error("Invalid AI stream");
        if ("error" in event) throw new Error("Incomplete AI stream");
        if ("delta" in event && typeof event.delta === "string") {
          reply += event.delta;
          if (reply.length > ASSISTANT_MAX_REPLY_TEXT) throw new Error("AI reply too large");
          onText(reply);
        } else if ("done" in event && event.done === true && reply.trim()) return reply.trim();
        else throw new Error("Invalid AI stream");
      }
      if (pending.length > 64_000 || done) throw new Error("Incomplete AI stream");
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
