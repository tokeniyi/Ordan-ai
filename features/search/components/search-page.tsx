"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { OptionSelect } from "@/features/chat/components/option-select"
import { SearchResults } from "@/features/search/components/search-results"
import { STRATEGY_OPTIONS } from "@/features/search/options"
import {
  SEARCH_METHODS,
  type ChunkStrategy,
  type SearchHit,
  type SearchMethod,
} from "@/features/search/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

const EXAMPLES = [
  "Can I take the bike on holiday?",
  "How long does charging take?",
  "What if my bike is stolen?",
]

const METHOD_LABELS: Record<SearchMethod, { title: string; note: string }> = {
  semantic: {
    title: "Semantic",
    note: "Embeddings: matches meaning, even with different words.",
  },
  keyword: {
    title: "Keyword (BM25)",
    note: "Matches the words themselves, weighted by how rare they are.",
  },
  hybrid: {
    title: "Hybrid",
    note: "Both lists merged by rank, so a chunk near the top of either rises.",
  },
}

type Results = Record<SearchMethod, SearchHit[]>

async function fetchHits(
  query: string,
  strategy: ChunkStrategy,
  method: SearchMethod
) {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, strategy, method, k: 5 }),
  })
  const data = (await response.json()) as { hits?: SearchHit[]; error?: string }
  if (!response.ok || !data.hits) {
    throw new Error(data.error ?? "Search failed.")
  }
  return data.hits
}

// Searches the Kestrel help centre with semantic and keyword search side by
// side, so the difference between the two is easy to see.
export function SearchPage() {
  const [query, setQuery] = React.useState("")
  const [strategy, setStrategy] = React.useState<ChunkStrategy>(
    STRATEGY_OPTIONS[0].id
  )
  const [results, setResults] = React.useState<Results>()
  const [error, setError] = React.useState<string>()
  const [isLoading, setIsLoading] = React.useState(false)

  async function run(text: string, chunking: ChunkStrategy = strategy) {
    const trimmed = text.trim()
    if (!trimmed) return
    setQuery(trimmed)
    setIsLoading(true)
    setError(undefined)
    try {
      const lists = await Promise.all(
        SEARCH_METHODS.map((method) => fetchHits(trimmed, chunking, method))
      )
      setResults(
        Object.fromEntries(
          SEARCH_METHODS.map((method, i) => [method, lists[i]])
        ) as Results
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-medium">Search</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Search the help centre of Kestrel Cycle Club, a made-up bike rental
            company. The pages are split into chunks, and each chunk is turned
            into an embedding by a small model that runs on the server. Pick a
            chunking strategy to see how it changes the results.
          </p>
        </section>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            run(query)
          }}
        >
          <InputGroup>
            <InputGroupInput
              aria-label="Search query"
              placeholder="Ask about prices, batteries, repairs…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="submit"
                variant="default"
                size="icon-sm"
                aria-label="Run search"
                disabled={!query.trim() || isLoading}
              >
                <SearchIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <div className="flex flex-wrap items-center gap-2">
            <OptionSelect
              label="Chunking"
              options={STRATEGY_OPTIONS}
              value={strategy}
              onValueChange={(value) => {
                setStrategy(value as ChunkStrategy)
                if (results) run(query, value as ChunkStrategy)
              }}
            />
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => run(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Search failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && !results && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Searching… The first search loads the embedding model, which takes a
            few seconds.
          </p>
        )}

        {results && (
          <div
            className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
            aria-busy={isLoading}
          >
            {SEARCH_METHODS.map((method) => (
              <section key={method} className="flex flex-col gap-3">
                <div>
                  <h2 className="text-sm font-medium">
                    {METHOD_LABELS[method].title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {METHOD_LABELS[method].note}
                  </p>
                </div>
                <SearchResults
                  label={`${METHOD_LABELS[method].title} results`}
                  hits={results[method]}
                />
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
