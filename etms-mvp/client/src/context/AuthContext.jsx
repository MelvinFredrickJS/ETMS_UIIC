import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token,           setToken]           = useState(null)
  const [user,            setUser]            = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading,       setIsLoading]       = useState(true)

  const navigate = useNavigate()

  // On mount — restore session from sessionStorage (per-tab isolation)
  useEffect(() => {
    const storedToken = sessionStorage.getItem('token')
    const storedUser  = sessionStorage.getItem('user')
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
        setIsAuthenticated(true)
      } catch {
        sessionStorage.clear()
      }
    }
    setIsLoading(false)
  }, [])

  function login(newToken, newUser, requiresPasswordChange = false) {
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

export function useAuth() {
  return useContext(AuthContext)
}
