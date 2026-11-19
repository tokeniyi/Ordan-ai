import { expect, test } from "@playwright/test"

import { mockModel } from "./mock-model"

test("/compare sends one message to two prompts side by side", async ({
  page,
}) => {
  const requests = await mockModel(page)
  await page.goto("/compare")

  const left = page.getByRole("combobox", { name: "Left prompt" })
  const right = page.getByRole("combobox", { name: "Right prompt" })
  await expect(left).toHaveText(/Structured/)
  await expect(right).toHaveText(/Baseline/)

  await right.click()
  await page.getByRole("option", { name: /Few-shot tutor/ }).click()
  await expect(right).toHaveText(/Few-shot tutor/)

  await page.getByPlaceholder("Send a message…").fill("Explain recursion.")
  await page.getByRole("button", { name: "Send message" }).click()

  await expect(
    page.getByText("Mock reply from the structured prompt.")
  ).toBeVisible()
  await expect(
    page.getByText("Mock reply from the few-shot prompt.")
  ).toBeVisible()
  expect(requests.map((request) => request.promptId).sort()).toEqual([
    "few-shot",
    "structured",
  ])
})
