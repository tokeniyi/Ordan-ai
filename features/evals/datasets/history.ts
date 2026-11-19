import { type Dataset, type HistoryTurn } from "@/features/evals/types"

// Unrelated turns that push the early facts out of a small history budget.
// Every case shares them, so the cases differ only in what must be recalled.
const filler: HistoryTurn[] = [
  {
    role: "user",
    content: "Quick one: why is the sky blue?",
  },
  {
    role: "assistant",
    content:
      "Sunlight contains every colour. When it passes through the air, it hits gas molecules that are much smaller than the wavelength of visible light. Small particles scatter short wavelengths far more than long ones, an effect called Rayleigh scattering. Blue light has a short wavelength, so it is scattered across the whole sky and reaches your eyes from every direction. Violet is scattered even more, but there is less of it in sunlight and our eyes are less sensitive to it, so the sky looks blue. At sunset the light travels through more air, the blue is scattered away, and the reds and oranges are left.",
  },
  {
    role: "user",
    content: "What is the difference between a virus and a bacterium?",
  },
  {
    role: "assistant",
    content:
      "Bacteria are living single cells. They have their own metabolism, can grow and divide on their own, and most are harmless or even useful, like the ones in your gut. Viruses are much smaller and are not cells at all. They are genetic material in a protein coat, and they can only copy themselves by getting inside a host cell and using its machinery. That difference matters for treatment: antibiotics attack structures that bacteria have, such as their cell walls, so they work on bacterial infections but do nothing against viruses. Viral infections are prevented with vaccines and sometimes treated with antiviral drugs.",
  },
  {
    role: "user",
    content: "Can you explain what compound interest is?",
  },
  {
    role: "assistant",
    content:
      "Compound interest is interest earned on interest. With simple interest, you earn a fixed percentage of the original amount every year. With compound interest, each year's interest is added to the balance, and the next year's interest is calculated on that larger balance. For example, 1,000 at 5% a year becomes 1,050 after one year, then 1,102.50 after two, because the second year's 5% is taken on 1,050. The effect is small at first and grows over time, which is why starting to save early makes such a difference. The same maths works against you on debt, such as credit cards.",
  },
  {
    role: "user",
    content: "How do noise-cancelling headphones work?",
  },
  {
    role: "assistant",
    content:
      "They use small microphones on the outside of each ear cup to listen to the sound around you. A chip inside analyses that sound and produces a second sound wave that is its mirror image: where the noise wave has a peak, the new wave has a trough. When the two waves meet in your ear they cancel each other out, a process called destructive interference. This works best on steady, low-pitched noise like an aeroplane engine or an air conditioner, because it is predictable. Sudden or high-pitched sounds, like voices or a dog barking, are harder to cancel, so the padding of the ear cups does most of that work.",
  },
  {
    role: "user",
    content: "Why do we have leap years?",
  },
  {
    role: "assistant",
    content:
      "The Earth takes about 365.2422 days to go around the Sun, not exactly 365. If every year had 365 days, the calendar would drift by almost a quarter of a day each year, and after a few centuries the seasons would fall in the wrong months. Adding an extra day, 29 February, every four years fixes most of that. But that slightly overcorrects, so the Gregorian calendar skips the leap day in years divisible by 100, unless they are also divisible by 400. That is why 2000 was a leap year but 1900 was not. The rule keeps the calendar accurate to about one day in 3,000 years.",
  },
  {
    role: "user",
    content: "What makes a good password?",
  },
  {
    role: "assistant",
    content:
      "Length matters more than anything else. A long passphrase of four or five random words is both easier to remember and harder to crack than a short string of symbols. Every account should have its own password, because when one site is breached, attackers try the same email and password everywhere else. Avoid anything personal, such as names, birthdays or your pet, because that information is easy to find. The simplest way to follow all of this is a password manager, which generates and remembers a strong, unique password for every site. Turn on two-factor authentication wherever it is offered as well.",
  },
]

function conversation(
  opening: HistoryTurn[],
  closing: HistoryTurn[] = []
): HistoryTurn[] {
  return [...opening, ...filler, ...closing]
}

// Multi-turn cases for phase 3. Each conversation is longer than the
// budget, so the window strategy loses the opening turns and the summary
// strategy has to keep what matters from them. The control case needs only
// the latest turns, so every strategy should pass it.
export const history: Dataset = {
  id: "history",
  description:
    "Long conversations where the last question depends on something said near the start.",
  // Small enough that the opening turns do not fit, large enough that the
  // last few turns always do.
  historyBudget: 1200,
  cases: [
    {
      id: "recall-name-job",
      category: "recall",
      history: conversation([
        {
          role: "user",
          content:
            "Hi! I'm Tunde, I work as a night-shift nurse in Lagos. I have a few random questions for you today.",
        },
        {
          role: "assistant",
          content:
            "Nice to meet you, Tunde. Ask away, I'm happy to help with anything.",
        },
      ]),
      input: "Before I go, remind me: what's my name and what do I do?",
      reference:
        "The user's name is Tunde and they are a night-shift nurse in Lagos. Both the name and the job must be right.",
      checks: [{ type: "includesAll", values: ["Tunde", "nurse"] }],
    },
    {
      id: "recall-budget",
      category: "recall",
      history: conversation([
        {
          role: "user",
          content:
            "I'm planning a 5-day trip to Accra and my total budget is exactly $1,250 for everything. I'll come back to this later.",
        },
        {
          role: "assistant",
          content:
            "Got it: a 5-day trip to Accra with a total budget of $1,250. Ask me whenever you're ready to plan it.",
        },
      ]),
      input:
        "OK, back to my trip. If I split my budget evenly, how much can I spend per day?",
      reference:
        "The budget was $1,250 for 5 days, so $250 per day. An answer that asks for the budget or uses a different total is wrong.",
      checks: [{ type: "includesAll", values: ["250"] }],
    },
    {
      id: "recall-allergy",
      category: "constraint",
      history: conversation([
        {
          role: "user",
          content:
            "Important for later: I have a severe peanut allergy, so never suggest anything with peanuts.",
        },
        {
          role: "assistant",
          content:
            "Understood. I'll keep your peanut allergy in mind and won't suggest anything containing peanuts.",
        },
      ]),
      input: "Suggest one easy snack I could take to work. Just name it.",
      reference:
        "Any easy snack that contains no peanuts and no peanut products, such as fruit, yoghurt or crackers. Mentioning that it is peanut-free is good. Suggesting peanuts, peanut butter or a common peanut snack is wrong.",
      checks: [
        {
          type: "excludes",
          values: ["peanut butter", "trail mix", "satay", "groundnut"],
        },
      ],
    },
    {
      id: "recall-format",
      category: "constraint",
      history: conversation([
        {
          role: "user",
          content:
            "For this whole chat, end every answer with the exact line 'Over and out.' — it's a running joke with my team.",
        },
        {
          role: "assistant",
          content:
            "Deal. Every answer from now on will end that way.\n\nOver and out.",
        },
      ]),
      input: "What is the capital of Kenya?",
      reference:
        "Nairobi. Early in the chat the user asked for every answer to end with the line 'Over and out.', so the answer must end with it.",
      checks: [
        { type: "includesAll", values: ["Nairobi"] },
        { type: "matches", pattern: "over and out\\.?\\W*$", flags: "i" },
      ],
    },
    {
      id: "recall-list",
      category: "recall",
      history: conversation([
        {
          role: "user",
          content:
            "My three tasks for this week are: renew my passport, fix the leaking kitchen tap, and send the quarterly report to Ngozi.",
        },
        {
          role: "assistant",
          content:
            "Noted: renew your passport, fix the leaking kitchen tap, and send the quarterly report to Ngozi.",
        },
      ]),
      input: "What were the three tasks I listed for this week?",
      reference:
        "Renew the passport, fix the leaking kitchen tap, and send the quarterly report to Ngozi. All three must be listed.",
      checks: [{ type: "includesAll", values: ["passport", "tap", "Ngozi"] }],
    },
    {
      id: "recall-code",
      category: "code",
      history: conversation([
        {
          role: "user",
          content:
            "Here is a function from my project:\n\n```ts\nexport function calculateInvoiceTotal(items: { price: number; qty: number }[], taxRate: number) {\n  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)\n  return Math.round(subtotal * (1 + taxRate) * 100) / 100\n}\n```\n\nI'll ask you about it later.",
        },
        {
          role: "assistant",
          content:
            "Thanks. It sums price times quantity for each item, applies the tax rate, and rounds to two decimal places. Ask whenever you're ready.",
        },
      ]),
      input:
        "Write one Vitest test for the function I showed you earlier. Use its real name.",
      reference:
        "A Vitest test that imports and calls calculateInvoiceTotal with items and a tax rate, and checks a correctly computed result, such as two items with tax giving the rounded total.",
      checks: [
        { type: "includesAll", values: ["calculateInvoiceTotal"] },
        { type: "hasCodeBlock" },
      ],
    },
    {
      id: "recall-correction",
      category: "recall",
      history: conversation(
        [
          {
            role: "user",
            content:
              "My daughter's birthday party is on Saturday the 14th, at 3 pm.",
          },
          {
            role: "assistant",
            content: "Saturday the 14th at 3 pm. I'll remember that.",
          },
        ],
        [
          {
            role: "user",
            content:
              "Small change about the party: it moved to 4 pm, same day.",
          },
          {
            role: "assistant",
            content: "Updated: the party is now at 4 pm on Saturday the 14th.",
          },
        ]
      ),
      input: "What day and time is the party now?",
      reference:
        "Saturday the 14th at 4 pm. The day comes from the start of the chat and the new time from the latest turn. Saying 3 pm is wrong.",
      checks: [
        { type: "includesAll", values: ["14"] },
        { type: "matches", pattern: "\\b4\\s?(pm|p\\.m\\.|:00)", flags: "i" },
      ],
    },
    {
      id: "control-recent",
      category: "control",
      history: conversation(
        [],
        [
          {
            role: "user",
            content: "My cat is called Biscuit and she is 7 years old.",
          },
          {
            role: "assistant",
            content: "Biscuit sounds lovely. Seven is a nice age for a cat.",
          },
        ]
      ),
      input: "How old will my cat be in three years, and what's her name?",
      reference:
        "Biscuit will be 10. Both facts are in the turn just before the question, so every strategy has them.",
      checks: [{ type: "includesAll", values: ["Biscuit", "10"] }],
    },
  ],
}
