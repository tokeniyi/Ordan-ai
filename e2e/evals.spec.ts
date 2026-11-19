import { expect, test } from "@playwright/test"

test("/evals shows the latest committed run", async ({ page }) => {
  await page.goto("/evals")

  await expect(
    page.getByRole("heading", { name: "Evals", level: 1 })
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Cases" })).toBeVisible()

  const table = page.getByRole("table")
  await expect(
    table.getByRole("columnheader", { name: "Prompt" })
  ).toBeVisible()
  // One row per prompt in the run, plus the header row.
  await expect(table.getByRole("row")).toHaveCount(5)
  for (const name of ["structured", "baseline", "few-shot", "step-by-step"]) {
    await expect(
      table.getByRole("row", { name: new RegExp(`^${name} v`) })
    ).toBeVisible()
  }
})
