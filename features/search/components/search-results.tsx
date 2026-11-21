import { type SearchHit } from "@/features/search/types"
import { Badge } from "@/components/ui/badge"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item"

export function SearchResults({
  label,
  hits,
}: {
  label: string
  hits: SearchHit[]
}) {
  if (hits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No chunk matched. Keyword search needs at least one word in common.
      </p>
    )
  }

  return (
    <ItemGroup aria-label={label}>
      {hits.map((hit) => (
        <Item key={hit.chunk.id} variant="outline" role="listitem">
          <ItemHeader className="flex-wrap gap-2">
            <ItemTitle>
              {hit.rank}. {hit.chunk.docTitle}
              {hit.chunk.heading && (
                <span className="text-muted-foreground">
                  {" "}
                  › {hit.chunk.heading}
                </span>
              )}
            </ItemTitle>
            <span className="flex gap-1">
              <Badge variant="secondary" className="tabular-nums">
                score {hit.score}
              </Badge>
              <Badge variant="outline" className="tabular-nums">
                {hit.chunk.tokens} tokens
              </Badge>
            </span>
          </ItemHeader>
          <ItemContent>
            <ItemDescription className="line-clamp-none whitespace-pre-line">
              {hit.chunk.text}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}
