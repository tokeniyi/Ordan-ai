// Model ids from the Kilo AI Gateway. The first entry is the default.
// Full list: https://api.kilo.ai/api/gateway/models
export const MODELS = [
  { id: "kilo-auto/free", name: "Auto Free" },
  { id: "kilo-auto/efficient", name: "Auto Efficient" },
  { id: "kilo-auto/balanced", name: "Auto Balanced" },
  { id: "kilo-auto/frontier", name: "Auto Frontier" },
]

export const DEFAULT_MODEL = MODELS[0].id

export interface ChatModel {
  id: string
  name: string
}

export function isModelAllowed(id: string) {
  return MODELS.some((model) => model.id === id)
}
