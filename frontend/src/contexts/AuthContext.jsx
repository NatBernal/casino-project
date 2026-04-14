import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)      // { id, email, role }
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('casino_token')
    const u = localStorage.getItem('casino_user')
    if (t && u) {
      setToken(t)
      setUser(JSON.parse(u))
    }
    setLoading(false)
  }, [])

  const login = (jwt, userData) => {
    // jwt comes as "Bearer <token>" or just "<token>"
    const clean = jwt.startsWith('Bearer ') ? jwt : `Bearer ${jwt}`
    localStorage.setItem('casino_token', clean)
    localStorage.setItem('casino_user', JSON.stringify(userData))
    setToken(clean)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('casino_token')
    localStorage.removeItem('casino_user')
    setToken(null)
    setUser(null)
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}