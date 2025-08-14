import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import LoginForm from "@/components/login-form"

export default async function LoginPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")
  const userId = cookieStore.get("admin_user_id")
  const loginTime = cookieStore.get("admin_login_time")

  // Si tiene todas las cookies y no han expirado, redirigir al dashboard
  if (session && userId && loginTime) {
    const loginTimestamp = Number.parseInt(loginTime.value)
    const fourDaysInMs = 4 * 24 * 60 * 60 * 1000
    const isExpired = Date.now() - loginTimestamp > fourDaysInMs

    if (!isExpired) {
      redirect("/")
    }
  }

  return (
    <div className="login-container flex items-center justify-center bg-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-slate-100/50"></div>
      <div className="relative z-10 w-full max-w-md px-4">
        <LoginForm />
      </div>

      <div className="absolute top-0 left-0 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-slate-200/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
    </div>
  )
}
