import { type RetrievalCase } from "@/features/search/metrics"

// Questions about the Kestrel corpus in data/corpus/kestrel. Each names the
// passage that answers it. "paraphrase" questions avoid the document's own
// words, the way people usually ask. "keyword" questions reuse them.
// "follow-up" questions need the turns before them. The first 24 are from
// phase 4, the rest from phase 6.
export const RETRIEVAL_CASES: RetrievalCase[] = [
  {
    id: "price-commuter",
    kind: "keyword",
    question: "How much is the Commuter plan per month?",
    docId: "memberships",
    evidence: "| Commuter | €29 a month |",
  },
  {
    id: "student-discount",
    kind: "paraphrase",
    question: "I'm at university here, is there a cheaper rate for me?",
    docId: "memberships",
    evidence: "Students with a valid card from a Port Aven college get 20% off",
  },
  {
    id: "family-deposit",
    kind: "keyword",
    question: "Is there a deposit for the Family plan?",
    docId: "memberships",
    evidence: "The Family plan has a refundable deposit of €100",
  },
  {
    id: "pause-holiday",
    kind: "paraphrase",
    question:
      "I'm travelling for six weeks this summer. Do I still have to pay?",
    docId: "memberships",
    evidence:
      "pause your membership for up to two months in each calendar year",
  },
  {
    id: "cancel-notice",
    kind: "paraphrase",
    question: "How far in advance do I need to tell you if I want to stop?",
    docId: "memberships",
    evidence: "Monthly plans can be cancelled with 14 days' notice",
  },
  {
    id: "failed-payment",
    kind: "paraphrase",
    question: "What happens if my card gets declined?",
    docId: "memberships",
    evidence: "After two failed attempts the bike is locked remotely",
  },
  {
    id: "k1-range",
    kind: "paraphrase",
    question: "How far can the city bike go before it runs out of power?",
    docId: "bikes-and-batteries",
    evidence: "range of about 70 km in the standard assist mode",
  },
  {
    id: "charge-time",
    kind: "keyword",
    question: "How long does a full charge take?",
    docId: "bikes-and-batteries",
    evidence: "A full charge from empty takes about four and a half hours",
  },
  {
    id: "swap-station",
    kind: "paraphrase",
    question: "My battery is almost flat and I'm far from home. What can I do?",
    docId: "bikes-and-batteries",
    evidence:
      "swap your battery for a full one at any of our six swap stations",
  },
  {
    id: "cold-range",
    kind: "paraphrase",
    question: "Why does the bike not go as far in winter?",
    docId: "bikes-and-batteries",
    evidence: "Below 5 °C, expect about a quarter less range than usual",
  },
  {
    id: "service-interval",
    kind: "keyword",
    question: "How often is the bike serviced?",
    docId: "repairs-and-maintenance",
    evidence: "free full service every six months",
  },
  {
    id: "roadside-time",
    kind: "paraphrase",
    question:
      "I got a puncture on my way to work. How quickly can someone come?",
    docId: "repairs-and-maintenance",
    evidence:
      "a mechanic will reach you within 90 minutes between 7:00 and 21:00",
  },
  {
    id: "damage-cap",
    kind: "paraphrase",
    question:
      "If I crash and it's my fault, what's the most I could be charged?",
    docId: "repairs-and-maintenance",
    evidence: "up to a limit of €150 for each incident",
  },
  {
    id: "pressure-washer",
    kind: "keyword",
    question: "Can I clean the bike with a pressure washer?",
    docId: "repairs-and-maintenance",
    evidence: "Do not use a pressure washer",
  },
  {
    id: "delivery-towns",
    kind: "paraphrase",
    question: "Do you bring bikes to people living outside the city?",
    docId: "delivery-and-returns",
    evidence: "Delivery to Millbrook or Saltmarsh costs €15",
  },
  {
    id: "missed-delivery",
    kind: "paraphrase",
    question: "What if I'm not in when the bike arrives?",
    docId: "delivery-and-returns",
    evidence:
      "we wait 15 minutes and then rebook, and a missed delivery costs €20",
  },
  {
    id: "theft-excess",
    kind: "keyword",
    question: "What is the theft excess if the bike was locked?",
    docId: "theft-and-accidents",
    evidence: "you pay a theft excess of €80",
  },
  {
    id: "theft-late",
    kind: "paraphrase",
    question:
      "I only noticed my bike was gone two days later. Does that matter?",
    docId: "theft-and-accidents",
    evidence: "more than 24 hours late, the excess is €400",
  },
  {
    id: "liability",
    kind: "paraphrase",
    question: "Am I covered if I hit a pedestrian and they sue me?",
    docId: "theft-and-accidents",
    evidence: "legal liability up to €1,000,000",
  },
  {
    id: "unlock-app",
    kind: "paraphrase",
    question: "I left my key at the office. Can I still open the bike?",
    docId: "app-and-account",
    evidence: "you can unlock the frame lock from the app",
  },
  {
    id: "ride-history",
    kind: "keyword",
    question: "How long is ride history kept?",
    docId: "app-and-account",
    evidence: "Ride history is kept for 12 months and then deleted",
  },
  {
    id: "minimum-age",
    kind: "paraphrase",
    question: "Can my 15-year-old son ride one?",
    docId: "riding-rules",
    evidence: "Riders must be at least 16 years old",
  },
  {
    id: "abroad",
    kind: "paraphrase",
    question: "Can I bring the bike with me on vacation to Spain?",
    docId: "riding-rules",
    evidence: "European Union for up to 30 days in a row",
  },
  {
    id: "phone-number",
    kind: "keyword",
    question: "What is the support phone number?",
    docId: "about-and-contact",
    evidence: "+353 21 555 0142",
  },
  {
    id: "late-breakdown",
    kind: "paraphrase",
    question: "My bike broke down at 11pm. How am I supposed to get home?",
    docId: "repairs-and-maintenance",
    evidence: "taxi refund of up to €30",
  },
  {
    id: "card-bounced",
    kind: "paraphrase",
    question: "My bank card keeps bouncing. Will anything happen to the bike?",
    docId: "memberships",
    evidence: "After two failed attempts the bike is locked remotely",
  },
  {
    id: "downgrade-timing",
    kind: "paraphrase",
    question: "If I switch to a cheaper plan, when does that kick in?",
    docId: "memberships",
    evidence: "A downgrade starts on your next billing date",
  },
  {
    id: "emigrating",
    kind: "paraphrase",
    question: "I'm emigrating next month. Do I have to give the normal notice?",
    docId: "delivery-and-returns",
    evidence: "end your membership without the usual notice period",
  },
  {
    id: "sand",
    kind: "paraphrase",
    question: "Can I ride it along the sand at the seaside?",
    docId: "riding-rules",
    evidence: "on beaches, because sand and salt water damage the motor",
  },
  {
    id: "own-saddle",
    kind: "paraphrase",
    question: "Can I fit my own comfier seat?",
    docId: "riding-rules",
    evidence: "such as a different saddle, must be fitted by our mechanics",
  },
  {
    id: "tall-rider",
    kind: "paraphrase",
    question: "I'm two metres tall. Will the city bike fit me?",
    docId: "bikes-and-batteries",
    evidence: "fits riders from 155 cm to 195 cm tall",
  },
  {
    id: "own-injuries",
    kind: "paraphrase",
    question: "If I hurt myself in a crash, do you pay my medical bills?",
    docId: "theft-and-accidents",
    evidence: "It does not cover your own injuries",
  },
  {
    id: "ride-after-crash",
    kind: "paraphrase",
    question: "I fell off but the bike looks fine. Can I keep riding it?",
    docId: "theft-and-accidents",
    evidence: "Do not ride the bike again until it has been checked",
  },
  {
    id: "employer-receipts",
    kind: "paraphrase",
    question: "My boss pays me back for the bike. Where do I get receipts?",
    docId: "app-and-account",
    evidence: "Invoices for every payment are under Account, then Invoices",
  },
  {
    id: "wipe-data",
    kind: "paraphrase",
    question: "Can you wipe my data while I'm still a member?",
    docId: "app-and-account",
    evidence:
      "Deleting your data is only possible after your membership has ended",
  },
  {
    id: "sunny-balcony",
    kind: "paraphrase",
    question:
      "Is it OK to charge the battery out on my balcony in the summer heat?",
    docId: "bikes-and-batteries",
    evidence: "leave it in direct sun on a hot day",
  },
  {
    id: "return-ready",
    kind: "paraphrase",
    question: "What should I have ready when you pick the bike up at the end?",
    docId: "delivery-and-returns",
    evidence:
      "Please charge the battery and have the key, charger and lock ready",
  },
  {
    id: "islands",
    kind: "keyword",
    question: "Do you deliver to the islands?",
    docId: "delivery-and-returns",
    evidence: "We do not deliver to the islands yet",
  },
  {
    id: "chat-hours",
    kind: "keyword",
    question: "What are the opening hours of the support chat in the app?",
    docId: "about-and-contact",
    evidence: "answered by our support team from 7:00 to 22:00 every day",
  },
  {
    id: "k2-load",
    kind: "keyword",
    question: "What is the maximum total load of the K2 cargo bike?",
    docId: "riding-rules",
    evidence: "The K2 cargo bike can carry up to 200 kg in total",
  },
  {
    id: "lost-charger",
    kind: "keyword",
    question: "How much do I pay for a lost charger?",
    docId: "repairs-and-maintenance",
    evidence: "| Lost charger | €45 |",
  },
  {
    id: "followup-k2-range",
    kind: "follow-up",
    history: [
      { role: "user", content: "Tell me about the cargo bike." },
      {
        role: "assistant",
        content:
          "The K2 cargo bike has a long front box with a bench and seat belts for two children, weighs 38 kg and has a stronger motor for hills [1].",
      },
    ],
    question: "How far does it go on one charge?",
    docId: "bikes-and-batteries",
    evidence: "Its range is about 55 km with an empty box",
  },
  {
    id: "followup-student",
    kind: "follow-up",
    history: [
      { role: "user", content: "What does the Commuter plan cost?" },
      {
        role: "assistant",
        content:
          "The Commuter plan costs €29 a month and comes with the K1 city bike [1].",
      },
    ],
    question: "And if I'm still at college?",
    docId: "memberships",
    evidence: "Students with a valid card from a Port Aven college get 20% off",
  },
  {
    id: "followup-theft-late",
    kind: "follow-up",
    history: [
      { role: "user", content: "My bike was stolen from outside my flat." },
      {
        role: "assistant",
        content:
          "Sorry to hear that. Report it to the police and get a crime reference number, then report it in the app within 24 hours of noticing, with the reference number [1].",
      },
    ],
    question: "What if I only get round to it the day after tomorrow?",
    docId: "theft-and-accidents",
    evidence: "more than 24 hours late, the excess is €400",
  },
  {
    id: "followup-deposit",
    kind: "follow-up",
    history: [
      { role: "user", content: "Is there a deposit for the Family plan?" },
      {
        role: "assistant",
        content:
          "Yes. The Family plan has a refundable deposit of €100, because the cargo bike costs more to replace [1].",
      },
    ],
    question: "Do I get that back at the end, and how quickly?",
    docId: "memberships",
    evidence: "The deposit is returned within 10 working days",
  },
  {
    id: "followup-pause-annual",
    kind: "follow-up",
    history: [
      { role: "user", content: "I'm on the Annual Commuter plan." },
      {
        role: "assistant",
        content:
          "The Annual Commuter plan costs €290 a year and comes with the K1 city bike [1].",
      },
    ],
    question: "Can I pause it over the summer?",
    docId: "memberships",
    evidence: "Pauses are not available on the Annual Commuter plan",
  },
  {
    id: "followup-thanks-delivery",
    kind: "follow-up",
    history: [
      { role: "user", content: "What's the cheapest plan?" },
      {
        role: "assistant",
        content:
          "The Weekender plan, at €15 a month for the K1 city bike from Friday to Monday [1].",
      },
    ],
    question: "Thanks! And what would delivery to Millbrook cost me?",
    docId: "delivery-and-returns",
    evidence: "Delivery to Millbrook or Saltmarsh costs €15",
  },
  {
    id: "followup-swap-where",
    kind: "follow-up",
    history: [
      {
        role: "user",
        content: "My battery is nearly empty and I'm in town. Can I swap it?",
      },
      {
        role: "assistant",
        content: "Yes. Battery swaps are free and unlimited on every plan [1].",
      },
    ],
    question: "Where can I do that?",
    docId: "bikes-and-batteries",
    evidence: "six swap stations",
  },
]

// Messages that ask for nothing new, so a search would only add noise. The
// query planner should skip them. Each has the turns before it, as in a chat.
export const NO_SEARCH_CASES: {
  id: string
  history?: { role: "user" | "assistant"; content: string }[]
  message: string
}[] = [
  { id: "greeting", message: "Hi there!" },
  { id: "bare-thanks", message: "thanks" },
  ...[
    "Thanks, that's really helpful!",
    "ok cool",
    "Can you put that in one sentence?",
    "Could you format that as a bullet list?",
    "Great, bye!",
    "lol",
  ].map((message, i) => ({
    id: `after-answer-${i + 1}`,
    history: [
      {
        role: "user" as const,
        content: "How long does a full charge take?",
      },
      {
        role: "assistant" as const,
        content:
          "A full charge from empty takes about four and a half hours, and charging to 80% takes about three hours [1].",
      },
    ],
    message,
  })),
]
