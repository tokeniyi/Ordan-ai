import { type Dataset } from "@/features/evals/types"

// The help centre does not answer these. A good answer says so.
const NOT_COVERED =
  "The Kestrel help centre does not cover this. A good answer says it does not know or that the help centre does not say, and may suggest contacting Kestrel. It must not invent a policy, price or number."

// Questions about the made-up Kestrel Cycle Club. A model cannot know the
// answers from training, so without sources it can only guess or say it does
// not know. Every answerable case names the passage that answers it, so the
// run also measures whether retrieval found it.
export const rag: Dataset = {
  id: "rag",
  description:
    "Questions about the Kestrel help centre: answerable ones, follow-ups, questions it does not cover and one with a wrong fact.",
  knowledge: "kestrel",
  cases: [
    {
      id: "weekender-price",
      category: "answerable",
      input: "What does the weekend-only plan cost?",
      reference:
        "The Weekender plan costs €15 a month and covers the K1 city bike from Friday to Monday.",
      checks: [{ type: "includesAll", values: ["15"] }],
      retrieval: {
        docId: "memberships",
        evidence: "| Weekender | €15 a month |",
      },
    },
    {
      id: "annual-cancel",
      category: "answerable",
      input:
        "I signed up for the annual plan two months ago. Do I get my money back if I cancel now?",
      reference:
        "Partly. The full refund only applies in the first 30 days. After that the remaining months are refunded minus a €40 early-cancellation fee.",
      checks: [{ type: "includesAll", values: ["40"] }],
      retrieval: {
        docId: "memberships",
        evidence:
          "the remaining months are refunded minus a €40 early-cancellation fee",
      },
    },
    {
      id: "pause-annual",
      category: "answerable",
      input: "Can I pause my Annual Commuter membership while I'm away?",
      reference:
        "No. Pauses are not available on the Annual Commuter plan, because it is already discounted. Monthly plans can pause for up to two months a year.",
      retrieval: {
        docId: "memberships",
        evidence: "Pauses are not available on the Annual Commuter plan",
      },
    },
    {
      id: "cargo-children",
      category: "answerable",
      input: "How many kids fit in the cargo bike, and up to what age?",
      reference:
        "Two children up to six years old, on the bench in the front box with seat belts.",
      checks: [
        { type: "includesAny", values: ["two", "2"] },
        { type: "includesAny", values: ["six", "6"] },
      ],
      retrieval: {
        docId: "bikes-and-batteries",
        evidence: "seat belts for two children up to six years old",
      },
    },
    {
      id: "rider-weight",
      category: "answerable",
      input: "Is there a weight limit on the city bike?",
      reference:
        "Yes. On the K1 the rider and their luggage together may weigh up to 120 kg, and the rear rack takes up to 25 kg.",
      checks: [{ type: "includesAll", values: ["120"] }],
      retrieval: {
        docId: "riding-rules",
        evidence: "may weigh up to 120 kg",
      },
    },
    {
      id: "saltmarsh-delivery",
      category: "answerable",
      input: "How much is delivery to Saltmarsh?",
      reference:
        "€15, charged once with the first payment. Delivery inside Port Aven is free.",
      checks: [{ type: "includesAll", values: ["15"] }],
      retrieval: {
        docId: "delivery-and-returns",
        evidence: "Delivery to Millbrook or Saltmarsh costs €15",
      },
    },
    {
      id: "sunday-delivery",
      category: "answerable",
      input: "Can you deliver my bike on a Sunday?",
      reference:
        "No. There are no deliveries on Sundays or public holidays. Saturday slots run from 9:00 to 17:00.",
      retrieval: {
        docId: "delivery-and-returns",
        evidence: "There are no deliveries on Sundays or public holidays",
      },
    },
    {
      id: "late-breakdown",
      category: "answerable",
      input: "My bike broke down at 11pm. How am I supposed to get home?",
      reference:
        "Roadside help runs from 7:00 to 21:00, so outside those hours Kestrel collects the bike the next day and refunds a taxi home up to €30.",
      checks: [{ type: "includesAll", values: ["30"] }],
      retrieval: {
        docId: "repairs-and-maintenance",
        evidence: "taxi refund of up to €30",
      },
    },
    {
      id: "chain-lock",
      category: "answerable",
      input: "I lost the chain lock. What does a new one cost?",
      reference:
        "€35. Until the new lock arrives, keep the bike indoors, because theft cover needs both locks.",
      checks: [{ type: "includesAll", values: ["35"] }],
      retrieval: {
        docId: "theft-and-accidents",
        evidence: "If you lose the chain lock, the replacement costs €35",
      },
    },
    {
      id: "login-code",
      category: "answerable",
      input: "How long is the sign-in code valid?",
      reference: "The six-digit code expires after ten minutes.",
      checks: [{ type: "includesAny", values: ["ten minutes", "10 minutes"] }],
      retrieval: {
        docId: "app-and-account",
        evidence: "The code expires after ten minutes",
      },
    },
    {
      id: "partner-rides",
      category: "answerable",
      input: "Can my partner ride the bike too? I'm on the Commuter plan.",
      reference:
        "No. Only the member may ride a Commuter bike. On the Family plan one more adult from the same address can be added as a rider.",
      retrieval: {
        docId: "app-and-account",
        evidence:
          "Only the member may ride a Commuter, Weekender or Annual Commuter bike",
      },
    },
    {
      id: "helmet",
      category: "answerable",
      input: "Do I need a helmet? Can I get one from you?",
      reference:
        "Port Aven law does not require one on these bikes, but Kestrel strongly recommends it. A helmet can be added to any membership for €3 a month.",
      checks: [{ type: "includesAny", values: ["€3", "3 a month", "3 per"] }],
      retrieval: {
        docId: "riding-rules",
        evidence: "Every membership can add a helmet for €3 a month",
      },
    },
    {
      id: "complaint-escalation",
      category: "answerable",
      input:
        "Kestrel didn't sort out my complaint. Is there anyone else I can go to?",
      reference:
        "Yes. If Kestrel and the member cannot agree, the complaint can go to the Port Aven Consumer Board, which is free.",
      checks: [{ type: "includesAll", values: ["Consumer Board"] }],
      retrieval: {
        docId: "about-and-contact",
        evidence: "Port Aven Consumer Board",
      },
    },
    {
      id: "followup-deposit",
      category: "follow-up",
      history: [
        { role: "user", content: "I'm thinking about the Family plan." },
        {
          role: "assistant",
          content:
            "The Family plan costs €49 a month and comes with the K2 cargo bike, which can carry two young children or about four shopping bags [1].",
        },
      ],
      input: "Do I get the deposit back at the end, and how quickly?",
      reference:
        "Yes. The Family plan's €100 deposit is refundable and is returned within 10 working days after the bike comes back undamaged.",
      checks: [{ type: "includesAll", values: ["10"] }],
      retrieval: {
        docId: "memberships",
        evidence: "The deposit is returned within 10 working days",
      },
    },
    {
      id: "followup-range",
      category: "follow-up",
      history: [
        { role: "user", content: "Tell me about the cargo bike." },
        {
          role: "assistant",
          content:
            "The K2 cargo bike has a long front box with a bench and seat belts for two children, weighs 38 kg and has a stronger motor for hills [1].",
        },
      ],
      input: "How far does it go on one charge?",
      reference:
        "About 55 km with an empty box and about 40 km fully loaded. (The K1 city bike's 70 km is a different bike.)",
      checks: [{ type: "includesAll", values: ["55"] }],
      retrieval: {
        docId: "bikes-and-batteries",
        evidence: "Its range is about 55 km with an empty box",
      },
    },
    {
      id: "wrong-price",
      category: "false-premise",
      input: "Why does the Commuter plan cost €35 a month?",
      reference:
        "It does not. The Commuter plan costs €29 a month. A good answer corrects the price.",
      checks: [{ type: "includesAll", values: ["29"] }],
      retrieval: {
        docId: "memberships",
        evidence: "| Commuter | €29 a month |",
      },
    },
    {
      id: "buy-bike",
      category: "not-covered",
      input: "How much would it cost to buy a K1 outright?",
      reference: NOT_COVERED,
    },
    {
      id: "holiday-hours",
      category: "not-covered",
      input: "Is the depot open on public holidays?",
      reference: `${NOT_COVERED} The help centre gives the depot's hours (Monday to Saturday, 8:00 to 18:00, closed on Sundays) but says nothing about public holidays. Saying deliveries do not run on public holidays is fine.`,
    },
    {
      id: "battery-capacity",
      category: "not-covered",
      input: "What is the battery capacity of the K1 in watt-hours?",
      reference: `${NOT_COVERED} Giving the K1's range of about 70 km instead is fine.`,
    },
    {
      id: "referral",
      category: "not-covered",
      input: "Do I get a discount if I refer a friend?",
      reference: `${NOT_COVERED} Mentioning the 20% student discount as the only discount described is fine.`,
    },
  ],
}
