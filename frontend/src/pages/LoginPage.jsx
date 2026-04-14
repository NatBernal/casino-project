import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')       // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('USER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await authService.register(email, password, role)
        setSuccess('¡Cuenta creada! Ahora inicia sesión.')
        setMode('login')
      } else {
        const res = await authService.login(email, password)
        const tempCode = res?.data?.tempCode
        // Navigate to MFA, passing tempCode and email as state
        navigate('/mfa', { state: { tempCode, email } })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-box">
        <div className="auth-logo">
          <h1>♠ CASINO ROYAL</h1>
          <p>Plataforma de juego online</p>
        </div>

        <div className="flex gap-1" style={{ marginBottom: '1.5rem' }}>
          <button
            className={`btn btn-full ${mode === 'login' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => { setMode('login'); setError(''); setSuccess('') }}
            style={{ flex: 1 }}
          >
            Ingresar
          </button>
          <button
            className={`btn btn-full ${mode === 'register' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => { setMode('register'); setError(''); setSuccess('') }}
            style={{ flex: 1 }}
          >
            Registrarse
          </button>
        </div>

        {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="usuario@casino.co"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label>Tipo de cuenta</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="USER">Jugador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-gold btn-lg btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Procesando...</> : mode === 'login' ? 'Entrar al Casino' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="divider" />
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          El inicio de sesión requiere verificación de dos factores (MFA).
        </p>
      </div>
    </div>
  )
}