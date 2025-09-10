"use client"

import React, { useState, useRef } from "react"
import { useAtila } from "@/store/atila-provider"

export function DateSearch() {
  const { state } = useAtila()
  const [searchDate, setSearchDate] = useState<string>("")
  const [searchResult, setSearchResult] = useState<{status: string, message: string} | null>(null)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  // Timers to manage auto-dismiss with fade-out
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchDate) return

    // Clear any existing timers to avoid race conditions on rapid searches
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
    setIsFadingOut(false)

    // Check if date is available
    const reservationsForDate = state.reservas.filter((r) => r.fecha === searchDate)
    if (reservationsForDate.length === 0) {
      setSearchResult({ status: "success", message: "La fecha está disponible" })
    } else {
      const statuses = [...new Set(reservationsForDate.map((r) => r.estado))]
      setSearchResult({ status: "error", message: `La fecha tiene reservas: ${statuses.join(", ")}` })
    }

    // Auto-dismiss after 4s with 300ms fade-out
    const fadeDuration = 300
    const totalDuration = 4000
    clearTimerRef.current = setTimeout(() => {
      setIsFadingOut(true)
      fadeTimerRef.current = setTimeout(() => {
        setSearchResult(null)
        setIsFadingOut(false)
      }, fadeDuration)
    }, totalDuration - fadeDuration)
  }

 React.useEffect(() => {
   return () => {
     if (clearTimerRef.current) {
       clearTimeout(clearTimerRef.current)
       clearTimerRef.current = null
     }
     if (fadeTimerRef.current) {
       clearTimeout(fadeTimerRef.current)
       fadeTimerRef.current = null
     }
   }
 }, [])

 return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-grow">
          <input
            ref={inputRef}
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="h-11 sm:h-10 pl-3 pr-12 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 text-sm w-full date-input-hide-native"
          />
          {!focused && !searchDate && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm sm:hidden pointer-events-none select-none">
              dd/mm/aa
            </span>
          )}
          {/* Custom right calendar trigger for consistent right-edge icon */}
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors cursor-pointer"
            onClick={() => {
              try {
                (inputRef.current as any)?.showPicker?.()
              } catch {
                inputRef.current?.focus()
                inputRef.current?.click()
              }
            }}
            aria-label="Abrir selector de fecha"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                try {
                  (inputRef.current as any)?.showPicker?.()
                } catch {
                  inputRef.current?.focus()
                  inputRef.current?.click()
                }
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <button
          type="submit"
          className="p-1 text-teal-600 hover:text-teal-800 transition-colors duration-200 flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>
      {searchResult && (
        <div
          className={`mt-2 px-2 py-1 rounded-lg text-xs font-medium ${
            searchResult.status === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          } ${isFadingOut ? "animate-fade-out" : "animate-fade-in"}`}
          aria-live="polite"
        >
          {searchResult.message}
        </div>
      )}
    </div>
  )
}