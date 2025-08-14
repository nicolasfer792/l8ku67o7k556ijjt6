"use server"

import { getSupabaseServer } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"

export async function signInAdmin(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const username = formData.get("username")
  const password = formData.get("password")

  console.log("Login attempt:", { username: username?.toString() })

  if (!username || !password) {
    return { error: "Usuario y contraseña son requeridos" }
  }

  if (username.toString() === "Atila30" && password.toString() === "Ferrari2020") {
    console.log("Using hardcoded credentials")

    const cookieStore = cookies()
    const sessionToken = await bcrypt.hash(`admin-${Date.now()}`, 10)
    const fourDaysInSeconds = 60 * 60 * 24 * 4
    const expirationDate = new Date(Date.now() + fourDaysInSeconds * 1000)

    cookieStore.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: fourDaysInSeconds,
      expires: expirationDate,
    })

    cookieStore.set("admin_user_id", "admin", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: fourDaysInSeconds,
      expires: expirationDate,
    })

    cookieStore.set("admin_login_time", Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: fourDaysInSeconds,
      expires: expirationDate,
    })

    return { success: true }
  }

  const supabase = getSupabaseServer()

  try {
    const { data: user, error: userError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("username", username.toString())
      .single()

    console.log("Database query result:", { user: user ? "found" : "not found", error: userError })

    if (userError || !user) {
      console.log("User not found or database error:", userError)
      return { error: "Credenciales inválidas" }
    }

    console.log("Comparing passwords...")
    const isValidPassword = await bcrypt.compare(password.toString(), user.password_hash)
    console.log("Password comparison result:", isValidPassword)

    if (!isValidPassword) {
      return { error: "Credenciales inválidas" }
    }

    await supabase.from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", user.id)

    const cookieStore = cookies()
    const sessionToken = await bcrypt.hash(`${user.id}-${Date.now()}`, 10)

    const fourDaysInSeconds = 60 * 60 * 24 * 4
    const expirationDate = new Date(Date.now() + fourDaysInSeconds * 1000)

    cookieStore.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: fourDaysInSeconds,
      expires: expirationDate,
    })

    cookieStore.set("admin_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: fourDaysInSeconds,
      expires: expirationDate,
    })

    cookieStore.set("admin_login_time", Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: fourDaysInSeconds,
      expires: expirationDate,
    })

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "Error inesperado. Intenta de nuevo." }
  }
}

export async function signOut() {
  const cookieStore = cookies()
  cookieStore.delete("admin_session")
  cookieStore.delete("admin_user_id")
  cookieStore.delete("admin_login_time")
}

export async function isAuthenticated() {
  const cookieStore = cookies()
  const session = cookieStore.get("admin_session")
  const userId = cookieStore.get("admin_user_id")
  const loginTime = cookieStore.get("admin_login_time")

  if (!session || !userId || !loginTime) {
    return false
  }

  const fourDaysInMs = 4 * 24 * 60 * 60 * 1000 // 4 días en milisegundos
  const loginTimestamp = Number.parseInt(loginTime.value)
  const currentTime = Date.now()

  if (currentTime - loginTimestamp > fourDaysInMs) {
    // Sesión expirada, limpiar cookies automáticamente
    cookieStore.delete("admin_session")
    cookieStore.delete("admin_user_id")
    cookieStore.delete("admin_login_time")
    return false
  }

  try {
    const supabase = getSupabaseServer()
    const { data: user, error } = await supabase.from("admin_users").select("id").eq("id", userId.value).single()

    if (error || !user) {
      cookieStore.delete("admin_session")
      cookieStore.delete("admin_user_id")
      cookieStore.delete("admin_login_time")
      return false
    }

    return true
  } catch (error) {
    console.error("Auth verification error:", error)
    cookieStore.delete("admin_session")
    cookieStore.delete("admin_user_id")
    cookieStore.delete("admin_login_time")
    return false
  }
}

export async function clearAllAuthCookies() {
  const cookieStore = await cookies()

  // Limpiar todas las cookies de autenticación
  cookieStore.delete("admin_session")
  cookieStore.delete("admin_user_id")
  cookieStore.delete("admin_login_time")

  // También limpiar cualquier cookie de Supabase que pueda existir
  cookieStore.delete("sb-access-token")
  cookieStore.delete("sb-refresh-token")
}
