import { expect, test } from "@playwright/test"

import { type RagInfo } from "@/features/rag/types"

import { mockModel } from "./mock-model"

const rag: RagInfo = {
  knowledge: "kestrel",
  query: "What does the Family plan cost?",
  ms: 12,
  sources: [
    {
      n: 1,
      chunkId: "memberships#1",
      docId: "memberships",
      docTitle: "Memberships and prices",
      heading: "Plans",
      text: "| Family | €49 a month | K2 cargo bike |",
      score: 0.71,
    },
    {
      n: 2,
      chunkId: "memberships#2",
      docId: "memberships",
      docTitle: "Memberships and prices",
      heading: "Deposit",
      text: "The Family plan has a refundable deposit of €100.",
      score: 0.55,
    },
  ],
}

test("answers from the help centre with sources and inline citations", async ({
  page,
}) => {
  const requests = await mockModel(page, {
    metadata: (request) =>
      request.knowledge === "kestrel" ? { rag } : undefined,
    reply: () =>
      "The Family plan costs €49 a month [1], with a €100 deposit [2]. Use `plans[1]` in code.",
  })
  await page.goto("/")

  await page.getByRole("combobox", { name: "Knowledge" }).click()
  await page.getByRole("option", { name: /Kestrel help centre/ }).click()
  await expect(page.getByText(/Ask about Kestrel Cycle Club/)).toBeVisible()

  await page
    .getByRole("button", { name: "What does the Family plan cost?" })
    .click()

  expect(requests[0].knowledge).toBe("kestrel")

  // Citations become buttons with the passage one hover away. Code is left
  // alone.
  const citation = page.getByRole("button", {
    name: "Source 1: Memberships and prices",
  })
  await expect(citation).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Source 2: Memberships and prices" })
  ).toBeVisible()
  await expect(page.locator("code", { hasText: "plans[1]" })).toBeVisible()
  await citation.hover()
  await expect(
    page.getByText("| Family | €49 a month | K2 cargo bike |")
  ).toBeVisible()

  // The Sources line opens into the passages, each with its text.
  await page.mouse.move(0, 0)
  await page.getByRole("button", { name: "Used 2 sources" }).click()
  await page
    .getByRole("button", { name: /\[2\] Memberships and prices › Deposit/ })
    .click()
  await expect(
    page.getByText("The Family plan has a refundable deposit of €100.")
  ).toBeVisible()

  // The chat and its knowledge setting are saved.
  await page.reload()
  await expect(page.getByRole("combobox", { name: "Knowledge" })).toHaveText(
    /Kestrel help centre/
  )
  await expect(citation).toBeVisible()
})
