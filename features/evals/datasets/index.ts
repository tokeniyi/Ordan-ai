import { core } from "@/features/evals/datasets/core"
import { type Dataset } from "@/features/evals/types"

export const DATASETS: Dataset[] = [core]

export function getDataset(id: string) {
  return DATASETS.find((dataset) => dataset.id === id)
}
