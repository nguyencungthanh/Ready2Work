export const ASSISTANT_MAX_MESSAGES = 11;
export const ASSISTANT_MAX_USER_TEXT = 2_000;
export const ASSISTANT_MAX_REPLY_TEXT = 6_000;
export const ASSISTANT_MAX_HISTORY_TEXT = 16_000;
export const ASSISTANT_MAX_BODY_BYTES = 64_000;
export interface AssistantTurn { role: "user" | "model"; text: string }

/** Keep complete recent pairs, leaving room for the current question. */
export function assistantRequestHistory(previous: AssistantTurn[], question: string): AssistantTurn[] {
  const turns: AssistantTurn[] = [{ role: "user", text: question.trim() }];
  let size = turns[0]!.text.length;
  for (let index = previous.length - 2; index >= 0; index -= 2) {
    const user = previous[index]; const model = previous[index + 1];
    if (!user || !model || user.role !== "user" || model.role !== "model") break;
    if (turns.length + 2 > ASSISTANT_MAX_MESSAGES || size + user.text.length + model.text.length > ASSISTANT_MAX_HISTORY_TEXT) break;
    turns.unshift(user, model); size += user.text.length + model.text.length;
  }
  return turns;
}

export const ASSISTANT_FEATURE_PATHS = ["/roadmap/cv", "/simulations", "/interviews", "/report"] as const;
