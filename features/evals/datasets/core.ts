import { type Dataset } from "@/features/evals/types"

// A small, general test set for the chat. Keyword checks only test hard
// facts and format. Anything that can be worded many ways is left to the
// judge, because a keyword check fails right answers that use other words.
// Each category tests something a
// prompt can change: facts, reasoning, explaining, code, honesty, and
// following instructions.
export const core: Dataset = {
  id: "core",
  description: "General questions across six categories.",
  cases: [
    {
      id: "fact-capital",
      category: "facts",
      input: "What is the capital of Australia?",
      reference: "Canberra. Not Sydney or Melbourne.",
      checks: [
        { type: "includesAll", values: ["Canberra"] },
        { type: "maxWords", value: 60 },
      ],
    },
    {
      id: "fact-apollo",
      category: "facts",
      input: "In what year did Apollo 11 land on the Moon?",
      reference: "1969 (July 20, 1969).",
      checks: [
        { type: "includesAll", values: ["1969"] },
        { type: "maxWords", value: 60 },
      ],
    },
    {
      id: "reason-bat-ball",
      category: "reasoning",
      input:
        "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
      reference:
        "The ball costs $0.05 (5 cents), and the bat costs $1.05. The intuitive answer of $0.10 is wrong.",
      checks: [
        {
          type: "includesAny",
          values: ["0.05", "5 cents", "five cents", "5¢"],
        },
      ],
    },
    {
      id: "reason-widgets",
      category: "reasoning",
      input:
        "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?",
      reference:
        "5 minutes. Each machine makes one widget in 5 minutes, so 100 machines make 100 widgets in 5 minutes. 100 minutes is wrong.",
      checks: [{ type: "includesAny", values: ["5 minutes", "five minutes"] }],
    },
    {
      id: "reason-sheep",
      category: "reasoning",
      input: "A farmer has 17 sheep. All but 9 run away. How many are left?",
      reference: '9 sheep are left. "All but 9" means 9 stay. 8 is wrong.',
      checks: [{ type: "matches", pattern: "\\b(9|nine)\\b", flags: "i" }],
    },
    {
      id: "math-percent",
      category: "reasoning",
      input: "What is 23% of 480?",
      reference: "110.4",
      checks: [{ type: "includesAll", values: ["110.4"] }],
    },
    {
      id: "explain-rag",
      category: "explaining",
      input: "What is retrieval augmented generation?",
      reference:
        "A technique where relevant documents are retrieved from an external source (often with a search or vector index) and added to the model's prompt, so the model answers from that information. It lets a model use up-to-date or private data without retraining, and reduces made-up answers.",
      checks: [{ type: "minWords", value: 25 }],
    },
    {
      id: "explain-precision-recall",
      category: "explaining",
      input: "What is the difference between precision and recall?",
      reference:
        "Precision is the share of predicted positives that are actually positive: TP / (TP + FP). It drops with false positives. Recall is the share of actual positives that were found: TP / (TP + FN). It drops with false negatives. There is usually a trade-off between them.",
      checks: [{ type: "includesAll", values: ["precision", "recall"] }],
    },
    {
      id: "code-palindrome",
      category: "code",
      input:
        "Write a TypeScript function that returns true if a string is a palindrome, ignoring case and non-alphanumeric characters.",
      reference:
        "A correct TypeScript function that lowercases the string, removes non-alphanumeric characters (for example with /[^a-z0-9]/g), and compares it with its reverse. 'A man, a plan, a canal: Panama' should return true.",
      checks: [
        { type: "hasCodeBlock" },
        { type: "includesAny", values: ["tolowercase", "tolocalelowercase"] },
      ],
    },
    {
      id: "code-float",
      category: "code",
      input: "Why does 0.1 + 0.2 === 0.3 return false in JavaScript?",
      reference:
        "Numbers are IEEE 754 binary floating point. 0.1 and 0.2 cannot be stored exactly in binary, so their sum is 0.30000000000000004. Compare with a tolerance such as Number.EPSILON, or use integers or a decimal library.",
      checks: [{ type: "includesAny", values: ["floating", "ieee", "binary"] }],
    },
    {
      id: "honest-unknowable",
      category: "honesty",
      input: "What did I eat for breakfast this morning?",
      reference:
        "The assistant cannot know this. It has no access to the user's life or memory of earlier conversations. A good answer says so briefly and does not guess.",
    },
    {
      id: "honest-false-premise",
      category: "honesty",
      input: "Why did Albert Einstein win the Nobel Prize for relativity?",
      reference:
        "The premise is false. Einstein won the 1921 Nobel Prize in Physics for his explanation of the photoelectric effect, not for relativity. A good answer corrects the premise.",
      checks: [{ type: "includesAny", values: ["photoelectric"] }],
    },
    {
      id: "follow-only-words",
      category: "instructions",
      input:
        "Name the three primary colors of light. Reply with only the three words, separated by commas.",
      reference: "Red, green, blue. Nothing else: no sentence, no explanation.",
      checks: [
        { type: "includesAll", values: ["red", "green", "blue"] },
        { type: "maxWords", value: 6 },
      ],
    },
    {
      id: "follow-one-sentence",
      category: "instructions",
      input: "In one sentence, what is an API?",
      reference:
        "One sentence saying that an API is a defined interface that lets one piece of software request data or actions from another.",
      checks: [
        { type: "maxWords", value: 40 },
        { type: "matches", pattern: "^[^.!?]*[.!?]?\\s*$" },
      ],
    },
    {
      id: "follow-three-bullets",
      category: "instructions",
      input:
        "Explain what a vector database is in exactly 3 bullet points, each under 15 words. No introduction or conclusion.",
      reference:
        "Exactly three bullet points and nothing else. Together they say a vector database stores embeddings (vectors), finds the most similar ones to a query vector, and is used for semantic search or RAG.",
      checks: [{ type: "matches", pattern: "^(\\s*[-*•][^\\n]*\\n?){3}\\s*$" }],
    },
    {
      id: "follow-json",
      category: "instructions",
      input:
        "Reply with a JSON object with the keys name and year for the first person to walk on the Moon. No other text.",
      reference:
        'Only a JSON object, such as {"name": "Neil Armstrong", "year": 1969}. No code fence, explanation or other text.',
      checks: [
        { type: "matches", pattern: "^\\s*\\{[\\s\\S]*\\}\\s*$" },
        { type: "includesAll", values: ["armstrong", "1969"] },
      ],
    },
    {
      id: "reason-strawberry",
      category: "reasoning",
      input: 'How many times does the letter "r" appear in "strawberry"?',
      reference: "3 times: st-r-awbe-r-r-y.",
      checks: [{ type: "matches", pattern: "\\b(3|three)\\b", flags: "i" }],
    },
    {
      id: "reason-prime",
      category: "reasoning",
      input: "Is 1001 a prime number?",
      reference: "No. 1001 = 7 × 11 × 13.",
      checks: [{ type: "includesAll", values: ["7", "11", "13"] }],
    },
    {
      id: "explain-ambiguous",
      category: "explaining",
      input: "How long does it take to boil an egg?",
      reference:
        "It depends on how it is wanted. Roughly 6 to 7 minutes in boiling water for a soft or jammy yolk, and about 10 to 12 minutes for hard boiled. A good answer gives both, or says which it assumed.",
    },
    {
      id: "honest-myth",
      category: "honesty",
      input:
        "Why is the Great Wall of China visible from space with the naked eye?",
      reference:
        "The premise is a myth. The wall is long but only a few meters wide and close in color to its surroundings, so it is not visible to the naked eye from orbit. A good answer corrects the premise instead of explaining it.",
    },
  ],
}
