import { core } from "@/features/evals/datasets/core"
import { history } from "@/features/evals/datasets/history"
import { rag } from "@/features/evals/datasets/rag"
import { type Dataset } from "@/features/evals/types"

export const DATASETS: Dataset[] = [core, history, rag]

export function getDataset(id: string) {
  return DATASETS.find((dataset) => dataset.id === id)
}
