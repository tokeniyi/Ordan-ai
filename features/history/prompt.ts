import { type ContextInfo } from "@/features/history/types"

export const SUMMARY_SYSTEM_PROMPT = `You keep a running summary of a conversation between a user and an AI assistant. The summary replaces the older messages, so the assistant will only remember what you write down.

Keep:
- Facts the user gave about themselves: name, job, location, situation.
- Instructions and constraints that still apply: format, length, language, spelling, things to avoid.
- Specific values: numbers, amounts, dates, names, code identifiers.
- Decisions made and questions still open.

Drop small talk, and the details of answers the assistant could write again.

Rules:
- Write in the third person ("The user ...") as short bullet points.
- Keep exact values exactly as they were written.
- Stay under 200 words.
- If a previous summary is given, merge the new messages into it. Do not lose anything from it that still matters.
- Return only the summary.`

// The text the summarizer reads: the previous summary and the messages that
// are leaving the window.
export function summaryInput(
  previous: string | undefined,
  messages: { role: string; text: string }[]
) {
  const transcript = messages
    .map(
      ({ role, text }) => `${role === "user" ? "User" : "Assistant"}: ${text}`
    )
    .join("\n\n")
  return [
    previous ? `<previous_summary>\n${previous}\n</previous_summary>` : "",
    `<messages>\n${transcript}\n</messages>`,
  ]
    .filter(Boolean)
    .join("\n\n")
}

// Tells the model that older turns are gone, so it says so instead of
// inventing what they said.
export const WINDOW_NOTE = `<conversation_note>
Older messages in this conversation were removed to save space. If the user refers to something you cannot see, say so instead of guessing.
</conversation_note>`

// Adds what the model needs to know about the trimmed history to the system
// prompt: the summary, or a note that older messages were removed.
export function withHistory(
  system: string,
  info: Pick<ContextInfo, "strategy" | "firstSentMessageId" | "summary">
) {
  if (info.summary) {
    return `${system}

<conversation_summary>
The start of this conversation was summarized to save space. Treat this summary as things the user already told you.

${info.summary.text}
</conversation_summary>`
  }

  if (info.firstSentMessageId) {
    return `${system}

${WINDOW_NOTE}`
  }

  return system
}
