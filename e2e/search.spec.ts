import { expect, test } from "@playwright/test"

import { type SearchHit } from "@/features/search/types"

function hit(rank: number, docTitle: string, heading: string, text: string) {
  return {
    rank,
    score: 0.5,
    chunk: {
      id: `doc#${rank}`,
      docId: "doc",
      docTitle,
      heading,
      index: rank,
      text,
      start: 0,
      end: text.length,
      tokens: 42,
      embedText: text,
    },
  } satisfies SearchHit
}

test("/search shows semantic, keyword and hybrid results side by side", async ({
  page,
}) => {
  const requests: { query: string; strategy: string; method: string }[] = []
  await page.route("**/api/search", async (route) => {
    const body = route.request().postDataJSON()
    requests.push(body)
    await route.fulfill({
      json: {
        hits:
          body.method !== "keyword"
            ? [
                hit(
                  1,
                  "Riding rules",
                  "Taking the bike abroad",
                  "Up to 30 days in a row."
                ),
                hit(
                  2,
                  "Delivery and returns",
                  "Returning the bike",
                  "We collect the bike."
                ),
              ]
            : [],
      },
    })
  })

  await page.goto("/search")
  await expect(
    page.getByRole("heading", { name: "Search", level: 1 })
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Can I take the bike on holiday?" })
    .click()

  const semantic = page.getByRole("list", { name: "Semantic results" })
  await expect(semantic.getByRole("listitem")).toHaveCount(2)
  await expect(semantic.getByText("Up to 30 days in a row.")).toBeVisible()
  await expect(semantic.getByText("1. Riding rules")).toBeVisible()
  await expect(
    page
      .getByRole("list", { name: "Hybrid results" })
      .getByText("Up to 30 days in a row.")
  ).toBeVisible()
  await expect(page.getByText("No chunk matched.")).toBeVisible()

  expect(requests.map((r) => r.method).sort()).toEqual([
    "hybrid",
    "keyword",
    "semantic",
  ])
  expect(requests[0]).toMatchObject({
    query: "Can I take the bike on holiday?",
    strategy: "recursive-headings",
  })

  // Changing the chunking runs the search again with the new strategy.
  await page.getByRole("combobox", { name: "Chunking" }).click()
  await page.getByRole("option", { name: /Fixed size/ }).click()
  await expect.poll(() => requests.length).toBe(6)
  expect(requests.slice(3).every((r) => r.strategy === "fixed")).toBe(true)
})
