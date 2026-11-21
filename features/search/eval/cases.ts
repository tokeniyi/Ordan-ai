import { type RetrievalCase } from "@/features/search/metrics"

// Questions about the Kestrel corpus in data/corpus/kestrel. Each names the
// passage that answers it. "paraphrase" questions avoid the document's own
// words, the way people usually ask. "keyword" questions reuse them.
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
]
