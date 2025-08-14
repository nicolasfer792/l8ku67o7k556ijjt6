"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Lock, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signInAdmin } from "@/lib/auth-actions"

type AuthState = {
  error?: string
  success?: boolean
} | null

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="modern-button w-full h-12 text-base font-semibold">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Iniciando sesión...
        </>
      ) : (
        "Iniciar Sesión"
      )}
    </Button>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (state?.success) {
      router.push("/")
    }
  }, [state, router])

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const result = await signInAdmin(null, formData)
      setState(result)
    } catch (error) {
      setState({ error: "Error al iniciar sesión" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-white font-bold text-2xl shadow-lg overflow-hidden">
              <img
                src="/Atila.jpg"
                alt="Atila Salón Logo"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-slate-900 mb-1">Atila Reservas</h1>
            <p className="text-sm text-slate-500 mt-1">Acceso al panel de administración</p>
          </div>
        </div>

        <form action={handleSubmit} className="space-y-5">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {state.error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Atila30"
                  required
                  disabled={isLoading}
                  className="pl-10 h-11 bg-white border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-lg text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading}
                  className="pl-10 h-11 bg-white border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-lg text-slate-900"
                />
              </div>
            </div>
          </div>

          <SubmitButton />
        </form>

        <div className="text-center">
          <p className="text-xs text-slate-500">Sistema seguro con autenticación avanzada</p>
        </div>
      </div>
    </div>
  )
}
