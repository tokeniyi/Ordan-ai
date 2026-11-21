import { expect, test, type Page } from "@playwright/test"

import { type ChatUIMessage } from "@/features/chat/types"
import { chatKey, INDEX_KEY, type SavedChat } from "@/features/history/store"

import { mockModel } from "./mock-model"

const text = (id: string, role: "user" | "assistant", value: string) =>
  ({ id, role, parts: [{ type: "text", text: value }] }) as ChatUIMessage

function savedChat(
  id: string,
  title: string,
  messages: ChatUIMessage[]
): SavedChat {
  return {
    id,
    title,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    model: "kilo-auto/free",
    promptId: "baseline",
    strategy: "summary",
    messages,
  }
}

// Puts chats in localStorage before the page loads. Only once per test, so
// a reload shows what the app saved, not the seed again.
async function seed(page: Page, chats: SavedChat[]) {
  // Serialized here, because the browser only receives plain JSON.
  const entries: [string, string][] = [
    ...chats.map((chat): [string, string] => [
      chatKey(chat.id),
      JSON.stringify(chat),
    ]),
    [
      INDEX_KEY,
      JSON.stringify(
        chats.map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
      ),
    ],
  ]
  await page.addInitScript((entries: [string, string][]) => {
    if (sessionStorage.getItem("seeded")) return
    sessionStorage.setItem("seeded", "1")
    for (const [key, value] of entries) localStorage.setItem(key, value)
  }, entries)
}

const sidebar = (page: Page) =>
  page.locator("[data-slot=sidebar]").getByRole("list")

test("a new chat is saved, listed and still there after a reload", async ({
  page,
}) => {
  const requests = await mockModel(page)
  await page.goto("/")
  await expect(page.getByText("No saved chats yet.")).toBeVisible()

  await page
    .getByPlaceholder("Send a message…")
    .fill("What is a context window?")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(
    page.getByText("Mock reply from the structured prompt.")
  ).toBeVisible()

  // The chat gets its own address and appears in the list.
  await expect(page).toHaveURL(/\/chat\/[\w-]+$/)
  const link = sidebar(page).getByRole("link", {
    name: "What is a context window?",
  })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute("aria-current", "page")
  expect(requests[0].history).toEqual({ strategy: "summary" })

  await page.reload()
  await expect(
    page.getByText("Mock reply from the structured prompt.")
  ).toBeVisible()
  await expect(
    page.getByText("What is a context window?").first()
  ).toBeVisible()
  // Follow-ups are not fetched again for a reply that was loaded.
  await expect(
    page.getByRole("button", { name: "Give an example" })
  ).toHaveCount(0)

  // The saved chat continues with its whole history.
  await page.getByPlaceholder("Send a message…").fill("And a token?")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(
    page.getByText("Mock reply from the structured prompt.")
  ).toHaveCount(2)
  expect(requests[1].messages.map((m) => m.role)).toEqual([
    "user",
    "assistant",
    "user",
  ])
})

test("saved chats open from the list and can be deleted", async ({ page }) => {
  await mockModel(page)
  await seed(page, [
    savedChat("seeded-1", "Plan a trip to Accra", [
      text("u1", "user", "Plan a trip to Accra"),
      text("a1", "assistant", "Here is a three-day plan for Accra."),
    ]),
  ])
  await page.goto("/")

  await sidebar(page)
    .getByRole("link", { name: "Plan a trip to Accra" })
    .click()
  await expect(page).toHaveURL(/\/chat\/seeded-1$/)
  await expect(
    page.getByText("Here is a three-day plan for Accra.")
  ).toBeVisible()
  // The chat's own settings come back with it.
  await expect(page.getByRole("combobox", { name: "Prompt" })).toHaveText(
    /Baseline/
  )

  await sidebar(page)
    .getByRole("button", { name: "Delete Plan a trip to Accra" })
    .click({ force: true })
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText("No saved chats yet.")).toBeVisible()

  await page.goto("/chat/seeded-1")
  await expect(page.getByText("Chat not found")).toBeVisible()
})

test("the summary from the server is shown and sent back", async ({ page }) => {
  const requests = await mockModel(page, {
    // Pretend the server summarized everything before the latest question.
    metadata: (request) => {
      const last = request.messages.at(-1)!
      const earlier = request.messages.at(-2)
      return {
        context: {
          strategy: "summary",
          budget: 4000,
          estimatedTokens: 1000,
          totalMessages: request.messages.length,
          sentMessages: 1,
          ...(earlier && {
            firstSentMessageId: last.id,
            summary: {
              text: "- The user is called Ada.",
              throughMessageId: earlier.id,
            },
            summarized: true,
          }),
        },
        usage: { inputTokens: 1200, outputTokens: 80, reasoningTokens: 20 },
      }
    },
  })
  await seed(page, [
    savedChat("long", "My name is Ada", [
      text("u1", "user", "My name is Ada"),
      text("a1", "assistant", "Hello Ada."),
    ]),
  ])
  await page.goto("/chat/long")

  await page.getByPlaceholder("Send a message…").fill("What is my name?")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(
    page.getByText("Mock reply from the baseline prompt.")
  ).toBeVisible()

  // A Checkpoint marker shows where the model's view of the chat begins.
  const boundary = page.getByRole("separator", { name: "Context boundary" })
  await expect(boundary).toContainText("Earlier messages summarized")
  await boundary.getByRole("button", { name: "View summary" }).hover()
  await expect(page.getByText("- The user is called Ada.")).toBeVisible()

  // The Context indicator shows the budget used and the reply's tokens.
  const contextButton = page.getByRole("button", { name: "25% context" })
  await contextButton.hover()
  await expect(
    page.getByText("2 older messages were sent as a summary.", {
      exact: false,
    })
  ).toBeVisible()
  await expect(page.getByText("1.2k")).toBeVisible()

  // The next message carries the summary, so the server need not rebuild it.
  await page.getByPlaceholder("Send a message…").fill("Thanks!")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(
    page.getByText("Mock reply from the baseline prompt.")
  ).toHaveCount(2)
  expect(requests[1].history).toEqual({
    strategy: "summary",
    summary: { text: "- The user is called Ada.", throughMessageId: "a1" },
  })
})

test("restoring a checkpoint removes the later messages", async ({ page }) => {
  await mockModel(page)
  await seed(page, [
    savedChat("restore", "First question", [
      text("u1", "user", "First question"),
      text("a1", "assistant", "First answer."),
      text("u2", "user", "Second question"),
      text("a2", "assistant", "Second answer."),
    ]),
  ])
  await page.goto("/chat/restore")
  await expect(page.getByText("Second answer.")).toBeVisible()

  // Only earlier replies can be restored to.
  await expect(
    page.getByRole("button", { name: "Restore to here" })
  ).toHaveCount(1)
  await page.getByRole("button", { name: "Restore to here" }).click()
  await expect(page.getByText("Second answer.")).toHaveCount(0)
  await expect(page.getByText("Second question")).toHaveCount(0)
  await expect(page.getByText("First answer.")).toBeVisible()

  // The restored chat is what is saved.
  await page.reload()
  await expect(page.getByText("First answer.")).toBeVisible()
  await expect(page.getByText("Second answer.")).toHaveCount(0)
})
