import type React from "react"
import type { Metadata } from "next"
import { Montserrat, Open_Sans } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { AtilaProvider } from "@/store/atila-provider"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Atila Salón - Dashboard de Reservas",
  description: "Sistema de gestión de reservas para Atila Salón de Fiestas",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${montserrat.variable} ${openSans.variable}`}>
      <body className="font-body antialiased">
        <AtilaProvider>
          <div className="min-h-screen bg-slate-50">
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
          </div>
        </AtilaProvider>
        <Toaster />
      </body>
    </html>
  )
}
