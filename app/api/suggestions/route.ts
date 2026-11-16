import { z } from "zod"

import { hasApiKey } from "@/lib/ai/provider"
import { generateFollowUps } from "@/features/suggestions/generate"

export const maxDuration = 30

const bodySchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
})

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return Response.json({ error: "KILO_API_KEY is not set." }, { status: 500 })
  }

  const body = bodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }

  try {
    const questions = await generateFollowUps({
      ...body.data,
      abortSignal: req.signal,
    })
    return Response.json({ questions })
  } catch (error) {
    console.error(error)
    return Response.json(
      { error: "Could not generate suggestions." },
      { status: 502 }
    )
  }
}
