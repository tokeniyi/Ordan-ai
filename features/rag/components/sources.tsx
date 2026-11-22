"use client"

import { BookOpenIcon, FileTextIcon } from "lucide-react"

import { passageText } from "@/features/rag/passage"
import { type RagInfo } from "@/features/rag/types"
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

// The shadcn/ui Sources pattern: a Trace line that says how many passages
// the reply was given, and opens into one line per passage. Each passage
// opens to show its text, so the answer can be checked against it.
export function Sources({ rag }: { rag: RagInfo }) {
  const { sources } = rag

  // The steps above already say that no search was run.
  if (rag.searched === false) return null

  if (sources.length === 0) {
    return (
      <Trace>
        <TraceLine>
          <TraceIcon>
            <BookOpenIcon />
          </TraceIcon>
          <TraceTitle>No matching passages in the help centre</TraceTitle>
        </TraceLine>
      </Trace>
    )
  }

  return (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <BookOpenIcon />
            </TraceIcon>
            <TraceTitle>
              Used {sources.length}{" "}
              {sources.length === 1 ? "source" : "sources"}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {sources.map((source) => (
              <TraceCollapsible key={source.chunkId}>
                <TraceCollapsibleTrigger>
                  <TraceLine>
                    <TraceIcon>
                      <FileTextIcon />
                    </TraceIcon>
                    <TraceTitle>
                      [{source.n}] {source.docTitle}
                      {source.heading && ` › ${source.heading}`}
                    </TraceTitle>
                    <TraceDescription>
                      {source.score.toFixed(2)}
                    </TraceDescription>
                  </TraceLine>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent className="text-sm whitespace-pre-wrap">
                  {passageText(source.text)}
                </TraceCollapsibleContent>
              </TraceCollapsible>
            ))}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}
