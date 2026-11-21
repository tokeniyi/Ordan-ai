import type { Metadata } from "next"

import { SearchPage } from "@/features/search/components/search-page"

export const metadata: Metadata = {
  title: "Search · Ordan AI",
}

export default function Page() {
  return <SearchPage />
}
