// The instructions for generating follow-up questions. The output shape is
// enforced by the schema in generate.ts, not by this text.
export const FOLLOW_UP_SYSTEM_PROMPT = `You suggest follow-up questions for a chat between a user and an AI assistant.

Given the user's last question and the assistant's answer, write 3 questions the user is likely to ask next.

Rules:
- Write each question from the user's point of view, as something they would type.
- Keep each question under 10 words.
- Make the 3 questions different from each other: one that goes deeper, one that asks for an example or how to apply it, and one that explores a related topic.
- Do not repeat the question the user already asked.`
