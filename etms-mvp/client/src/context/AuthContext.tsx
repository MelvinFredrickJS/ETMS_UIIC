import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: User, requiresPasswordChange?: boolean) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token,           setToken]           = useState<string | null>(null)
  const [user,            setUser]            = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading,       setIsLoading]       = useState(true)

  const navigate = useNavigate()

  // On mount — restore session from sessionStorage (per-tab isolation)
  useEffect(() => {
    const storedToken = sessionStorage.getItem('token')
    const storedUser  = sessionStorage.getItem('user')
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User
        setToken(storedToken)
        setUser(parsedUser)
        setIsAuthenticated(true)
      } catch {
        sessionStorage.clear()
      }
    }
    setIsLoading(false)
  }, [])

  function login(newToken: string, newUser: User, requiresPasswordChange = false) {
    sessionStorage.setItem('token', newToken)
    sessionStorage.setItem('user', JSON.stringify(newUser))
    sessionStorage.setItem('requiresPasswordChange', requiresPasswordChange ? 'true' : 'false')
    setToken(newToken)
    setUser(newUser)
    setIsAuthenticated(true)
  }

  function logout() {
    sessionStorage.clear()
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
