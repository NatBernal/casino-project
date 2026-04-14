import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// Parse JWT payload without verification (for getting user info)
function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

export default function MFAPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const { tempCode, email } = location.state || {}

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devCode, setDevCode] = useState('')
  const [fetchingDev, setFetchingDev] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    if (!tempCode) navigate('/login')
  }, [tempCode, navigate])

  // Auto-fetch dev MFA code
  const fetchDevCode = async () => {
    setFetchingDev(true)
    try {
      const res = await authService.getMfaCode(tempCode)
      const code = res?.mfaCode || ''
      setDevCode(code)
      // Auto-fill digits
      const arr = code.split('').slice(0, 6)
      const filled = [...arr, ...Array(6 - arr.length).fill('')]
      setDigits(filled)
    } catch (err) {
      setError('No se pudo obtener el código MFA automático.')
    } finally {
      setFetchingDev(false)
    }
  }

  const handleDigit = (idx, val) => {
    const num = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = num
    setDigits(next)
    if (num && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const arr = paste.split('').concat(Array(6).fill('')).slice(0, 6)
    setDigits(arr)
    inputRefs.current[Math.min(paste.length, 5)]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const mfaCode = digits.join('')
    if (mfaCode.length < 6) { setError('Ingresa los 6 dígitos.'); return }
    setError(''); setLoading(true)
    try {
      const { token, body } = await authService.verifyMfa(tempCode, mfaCode)
      if (!token) throw new Error('No se recibió token de autenticación.')

      // Extract user info from JWT
      const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token
      const payload = parseJwt(rawToken)
      const userData = {
        id:    payload.sub || payload.userId || payload.id || body?.data?.id || '',
        email: payload.email || email || '',
        role:  payload.role  || payload.roles?.[0] || 'USER',
      }
      login(token, userData)
      navigate('/game')
    } catch (err) {
      setError(err.message || 'Código inválido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-box">
        <div className="auth-logo">
          <h1>♠ CASINO ROYAL</h1>
          <p>Verificación de identidad</p>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
            Ingresa el código de 6 dígitos enviado a<br />
            <strong style={{ color: 'var(--cream)' }}>{email}</strong>
          </p>
        </div>

        {/* Dev helper */}
        <div className="alert alert-info" style={{ marginBottom: '1.2rem', fontSize: '0.85rem' }}>
          <strong>Modo desarrollo:</strong>{' '}
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.1rem 0.5rem', marginLeft: '0.5rem' }}
            onClick={fetchDevCode}
            disabled={fetchingDev}
          >
            {fetchingDev ? <span className="spinner" /> : 'Obtener código automáticamente'}
          </button>
          {devCode && <><br /><span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.2em' }}>Código: {devCode}</span></>}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mfa-inputs" onPaste={handlePaste} style={{ marginBottom: '1.5rem' }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                className="mfa-digit"
                type="text" inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                autoFocus={i === 0}
              />
            ))}
          </div>
          <button
            type="submit"
            className="btn btn-gold btn-lg btn-full"
            disabled={loading || digits.join('').length < 6}
          >
            {loading ? <><span className="spinner" /> Verificando...</> : 'Verificar Acceso'}
          </button>
        </form>

        <div className="divider" />
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}