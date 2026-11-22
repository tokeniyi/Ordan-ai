"use client"

import {
  ArrowDownUpIcon,
  MessageCircleIcon,
  PencilLineIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react"

import { type RagInfo, type RetrievalStep } from "@/features/rag/types"
import { Badge } from "@/components/ui/badge"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

// The shadcn/ui Chain of Thought pattern: a summary line that opens into
// the steps the server took to find the sources. The steps arrive with the
// reply's first chunk, already finished, so none of them is shown running.
export function RetrievalSteps({ rag }: { rag: RagInfo }) {
  const steps = rag.steps ?? []
  // Phase 5 chats searched in one step and saved none.
  if (steps.length === 0) return null

  const summary =
    rag.searched === false
      ? "No search needed"
      : `Searched in ${steps.length} ${steps.length === 1 ? "step" : "steps"}`
  const seconds = (rag.ms / 1000).toFixed(1)

  return (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <SearchIcon />
            </TraceIcon>
            <TraceTitle>{summary}</TraceTitle>
            <TraceDescription>{seconds} s</TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent keepMounted>
          <Trace aria-label="Retrieval steps">
            {steps.map((step, index) => (
              <Step key={index} step={step} />
            ))}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}

function Step({ step }: { step: RetrievalStep }) {
  switch (step.type) {
    case "plan":
      return (
        <TraceLine>
          <TraceIcon>
            {step.search ? <PencilLineIcon /> : <MessageCircleIcon />}
          </TraceIcon>
          <TraceTitle className="whitespace-normal">
            {step.search
              ? `Searched for “${step.query}”`
              : "Skipped the search: the message asks for nothing new"}
          </TraceTitle>
        </TraceLine>
      )
    case "expand":
      return (
        <TraceCollapsible>
          <TraceCollapsibleTrigger>
            <TraceLine>
              <TraceIcon>
                <SparklesIcon />
              </TraceIcon>
              <TraceTitle>
                {step.kind === "hyde"
                  ? "Wrote a draft answer to search with"
                  : `Searched ${step.texts.length} other wordings`}
              </TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent className="flex flex-wrap gap-1.5 text-sm">
            {step.kind === "hyde"
              ? step.texts[0]
              : step.texts.map((text) => (
                  <Badge key={text} variant="secondary">
                    {text}
                  </Badge>
                ))}
          </TraceCollapsibleContent>
        </TraceCollapsible>
      )
    case "search":
      return (
        <TraceLine>
          <TraceIcon>
            <SearchIcon />
          </TraceIcon>
          <TraceTitle>
            Found {step.candidates} candidates with{" "}
            {step.method === "hybrid"
              ? "meaning and keyword search"
              : "meaning search"}
          </TraceTitle>
        </TraceLine>
      )
    case "rerank":
      return (
        <TraceLine>
          <TraceIcon>
            <ArrowDownUpIcon />
          </TraceIcon>
          <TraceTitle>Reranked them and kept the best</TraceTitle>
        </TraceLine>
      )
  }
}
