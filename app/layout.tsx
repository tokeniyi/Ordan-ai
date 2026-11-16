import type { Metadata } from "next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

import "./globals.css"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Ordan AI",
  description: "An AI engineering playground.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        GeistMono.variable,
        "font-sans",
        GeistSans.variable
      )}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <div className="flex h-svh flex-col">
              <SiteHeader />
              {children}
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
