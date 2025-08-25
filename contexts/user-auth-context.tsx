"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

interface User {
  id: string
  email: string
  name: string
  is_active: boolean
  is_verified: boolean
}

interface AuthUser extends User {
  access_token: string
  refresh_token: string
}

interface UserAuthContextType {
  user: AuthUser | null
  isGuest: boolean
  login: (userData: AuthUser) => void
  logout: () => void
  setGuestMode: (isGuest: boolean) => void
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined)

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isGuest, setIsGuest] = useState(true)

  useEffect(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem("user")
    const savedGuestMode = localStorage.getItem("isGuest")

    if (savedUser && savedGuestMode === "false") {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        setIsGuest(false)
      } catch (error) {
        console.error("Failed to parse saved user data:", error)
        localStorage.removeItem("user")
        localStorage.removeItem("isGuest")
      }
    }
  }, [])

  const login = (userData: AuthUser) => {
    setUser(userData)
    setIsGuest(false)
    localStorage.setItem("user", JSON.stringify(userData))
    localStorage.setItem("isGuest", "false")
  }

  const logout = () => {
    setUser(null)
    setIsGuest(true)
    localStorage.removeItem("user")
    localStorage.setItem("isGuest", "true")
  }

  const setGuestMode = (guest: boolean) => {
    setIsGuest(guest)
    localStorage.setItem("isGuest", guest.toString())
    if (guest) {
      setUser(null)
      localStorage.removeItem("user")
    }
  }

  return (
    <UserAuthContext.Provider value={{ user, isGuest, login, logout, setGuestMode }}>
      {children}
    </UserAuthContext.Provider>
  )
}

export function useUserAuth() {
  const context = useContext(UserAuthContext)
  if (context === undefined) {
    throw new Error("useUserAuth must be used within a UserAuthProvider")
  }
  return context
}
