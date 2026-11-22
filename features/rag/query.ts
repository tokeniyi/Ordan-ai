// Model calls that prepare a search: deciding whether to search, rewriting a
// follow-up as a question that stands on its own, and expanding a question
// into other texts to search with. Each takes the model call as an argument,
// so tests pass a fake and the chat and the evals pass a real model.

// A conversation turn as plain text.
export interface Turn {
  role: "user" | "assistant"
  text: string
}

// One model call: a system prompt and a user prompt in, text out.
export type Complete = (request: {
  system: string
  prompt: string
}) => Promise<string>

export interface QueryPlan {
  // Whether the newest message needs a search of the help centre.
  search: boolean
  // The question to search with, standing on its own. The newest message
  // when the plan could not be read.
  query: string
}

// Earlier turns given to the planner. Follow-ups refer back one or two
// turns, and every turn costs tokens and time before the first one streams.
const PLAN_TURNS = 4
const PLAN_TURN_CHARS = 600

export const PLAN_SYSTEM_PROMPT = `You prepare searches for a chat assistant that answers questions from the Kestrel Cycle Club help centre. Kestrel rents electric bikes by subscription.

Read the conversation and the newest message, then decide two things.

1. Does answering the newest message need a search of the help centre? Answer "no" only when the message asks for nothing new: a greeting, thanks, goodbye, a reaction such as "ok" or "great", or a request to reword, shorten, translate or reformat the previous answer. Answer "yes" for everything else, including questions that may not be about Kestrel. When unsure, answer "yes".
2. The search query. If the newest message makes sense on its own, copy it exactly. Rewrite it only when it refers to earlier turns: replace words such as "it", "that" or "this plan" with what they refer to in the conversation, and keep the user's own words otherwise. Do not add the company name or any detail that is not in the conversation, and do not answer the question. When the answer to 1 is "no", write "none".

Examples, after a turn about the K1 city bike:
- "What does it weigh?" becomes "What does the K1 city bike weigh?"
- "What if I forget to do that?" becomes the question with "that" replaced by the action it refers to.
- "Can I bring the bike abroad?" stays as it is.

Reply with exactly two lines and nothing else:
SEARCH: yes or no
QUERY: the query`

export function planPrompt(turns: Turn[]) {
  const newest = turns.at(-1)
  const earlier = turns.slice(0, -1).slice(-PLAN_TURNS)
  const conversation = earlier
    .map((turn) => `${turn.role}: ${clip(stripCitations(turn.text))}`)
    .join("\n")
  return `<conversation>
${conversation || "(no earlier messages)"}
</conversation>

<newest_message>
${newest?.text ?? ""}
</newest_message>`
}

// Reads the planner's reply. Anything it cannot read means search with the
// newest message, as before this phase: a needless search costs a little,
// while a skipped one can lose the answer.
export function parsePlan(reply: string, fallback: string): QueryPlan {
  const search = reply.match(/^\W*SEARCH\W*\s*(yes|no)\b/im)?.[1]?.toLowerCase()
  const query = reply
    .match(/^\W*QUERY\W*\s*(.+)$/im)?.[1]
    ?.trim()
    .replace(/^["'“]+|["'”]+$/g, "")
    .trim()

  if (search === "no") return { search: false, query: fallback }
  if (!query || /^none\.?$/i.test(query))
    return { search: true, query: fallback }
  return { search: true, query }
}

export async function planQuery({
  turns,
  complete,
}: {
  turns: Turn[]
  complete: Complete
}): Promise<QueryPlan> {
  const fallback = turns.at(-1)?.text.trim() ?? ""
  // A first message with nothing to refer back to still goes to the
  // planner, because "hi" can be the first message too.
  const reply = await complete({
    system: PLAN_SYSTEM_PROMPT,
    prompt: planPrompt(turns),
  })
  return parsePlan(reply, fallback)
}

export const HYDE_SYSTEM_PROMPT = `You write passages for a search engine. Given a question, write the passage from an electric bike subscription company's help centre that would answer it. Write 2 to 4 plain sentences in the style of a help page. Make up specific details where needed, such as prices, times and limits. Do not mention that the passage is made up, and do not use headings or lists.`

// HyDE (hypothetical document embeddings): the question is turned into a
// made-up answer, and the search looks for passages like that answer. An
// answer shares more words and meaning with the right passage than the
// question does, even when its details are wrong.
export async function hypotheticalPassage({
  query,
  complete,
}: {
  query: string
  complete: Complete
}) {
  const passage = await complete({ system: HYDE_SYSTEM_PROMPT, prompt: query })
  return passage.trim() || query
}

export const MULTI_QUERY_COUNT = 3

export const MULTI_QUERY_SYSTEM_PROMPT = `You help a search engine find passages in an electric bike subscription company's help centre. Given a question, write ${MULTI_QUERY_COUNT} other ways to search for its answer. Use the words a help page would use, such as plan, membership, deposit, charge, range, delivery, collection, theft, damage or account. Each must ask for the same thing as the question. Write one per line, with no numbering and nothing else.`

// Multi-query: the question is reworded several ways, each wording is
// searched, and the lists are merged. One of the wordings often matches the
// page better than the user's.
export async function queryVariants({
  query,
  complete,
}: {
  query: string
  complete: Complete
}) {
  const reply = await complete({
    system: MULTI_QUERY_SYSTEM_PROMPT,
    prompt: query,
  })
  return parseVariants(reply, query)
}

export function parseVariants(reply: string, query: string) {
  const seen = new Set([query.trim().toLowerCase()])
  const variants: string[] = []
  for (const line of reply.split("\n")) {
    const text = line
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
      .replace(/^["'“]+|["'”]+$/g, "")
      .trim()
    const key = text.toLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    variants.push(text)
  }
  return variants.slice(0, MULTI_QUERY_COUNT)
}

// Old answers number their own sources. The planner only needs the words.
function stripCitations(text: string) {
  return text.replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, "")
}

function clip(text: string) {
  return text.length > PLAN_TURN_CHARS
    ? `${text.slice(0, PLAN_TURN_CHARS)}…`
    : text
}
