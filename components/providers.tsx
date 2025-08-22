"use client"

import { AtilaProvider } from "@/store/atila-provider"
import React from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AtilaProvider>
      {children}
    </AtilaProvider>
  )
}