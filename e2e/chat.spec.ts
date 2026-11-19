import { expect, test } from "@playwright/test"

import { mockModel } from "./mock-model"

test("the prompt picker sends the chosen prompt with each message", async ({
  page,
}) => {
  const requests = await mockModel(page)
  await page.goto("/")

  const picker = page.getByRole("combobox", { name: "Prompt" })
  await expect(picker).toHaveText(/Structured/)

  await picker.click()
  for (const name of [
    "Structured",
    "Baseline",
    "Few-shot tutor",
    "Step by step",
  ]) {
    await expect(
      page.getByRole("option", { name: new RegExp(name) })
    ).toBeVisible()
  }
  await page.getByRole("option", { name: /Step by step/ }).click()
  await expect(picker).toHaveText(/Step by step/)

  await page.getByPlaceholder("Send a message…").fill("What is 2 + 2?")
  await page.getByRole("button", { name: "Send message" }).click()

  await expect(
    page.getByText("Mock reply from the step-by-step prompt.")
  ).toBeVisible()
  expect(requests).toMatchObject([
    {
      model: "kilo-auto/free",
      promptId: "step-by-step",
      history: { strategy: "summary" },
    },
  ])

  // Follow-up suggestions appear once the reply has finished.
  await expect(
    page.getByRole("button", { name: "Give an example" })
  ).toBeVisible()
})
