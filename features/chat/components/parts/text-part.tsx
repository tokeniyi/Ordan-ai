"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { MarkdownPre } from "@/features/chat/components/markdown-code"
import { type TextMessagePart } from "@/features/chat/types"
import { citationFromHref } from "@/features/rag/citations"
import { Citation } from "@/features/rag/components/citation"
import { remarkCitations } from "@/features/rag/remark-citations"
import { type RagSource } from "@/features/rag/types"

export function TextPart({
  part,
  sources,
}: {
  part: TextMessagePart
  // The sources the reply was given. With them, "[1]" becomes a citation.
  sources?: RagSource[]
}) {
  return (
    <div className="typeset typeset-docs">
      <ReactMarkdown
        remarkPlugins={sources ? [remarkGfm, remarkCitations] : [remarkGfm]}
        components={{
          pre: MarkdownPre,
          // react-markdown passes its syntax tree node, which is not an
          // HTML attribute, so it is left out of the props.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a: ({ href, children, node, ...props }) => {
            const n = sources ? citationFromHref(href) : undefined
            if (n !== undefined) {
              return (
                <Citation
                  n={n}
                  source={sources?.find((source) => source.n === n)}
                />
              )
            }
            return (
              <a href={href} {...props}>
                {children}
              </a>
            )
          },
        }}
      >
        {part.text}
      </ReactMarkdown>
    </div>
  )
}
