"use client"

import { createBrowserClient, type SupabaseClient } from "@supabase/ssr"

let supabaseBrowser: SupabaseClient | null = null

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// Keep the original function for backward compatibility
export function getSupabaseBrowser() {
  if (supabaseBrowser) return supabaseBrowser
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    console.warn("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  supabaseBrowser = createClient(url!, anon!)
  return supabaseBrowser
}
