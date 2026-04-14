import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { gameService, walletService } from '../services/api'
import PlayingCard from '../components/PlayingCard'

const ESTADO_LABELS = {
  ACTIVA:              { label: 'Partida activa', cls: 'badge-yellow' },
  BLACKJACK_JUGADOR:   { label: '♠ Blackjack Natural!', cls: 'badge-green' },
  BLACKJACK_DEALER:    { label: 'Blackjack Dealer', cls: 'badge-red' },
  JUGADOR_GANO:        { label: 'Ganaste 🏆', cls: 'badge-green' },
  DEALER_GANO:         { label: 'Ganó el Dealer', cls: 'badge-red' },
  EMPATE:              { label: 'Empate', cls: 'badge-gray' },
  JUGADOR_SE_PASO:     { label: 'Te pasaste de 21', cls: 'badge-red' },
  DEALER_SE_PASO:      { label: 'Dealer se pasó 🏆', cls: 'badge-green' },
  ABANDONADA:          { label: 'Partida Abandonada', cls: 'badge-gray' },
}

const WIN_STATES = ['BLACKJACK_JUGADOR', 'JUGADOR_GANO', 'DEALER_SE_PASO']
const LOSE_STATES = ['BLACKJACK_DEALER', 'DEALER_GANO', 'JUGADOR_SE_PASO', 'ABANDONADA']

const CHIPS = [
  { valor: 50,   cls: 'chip-red',   label: '50' },
  { valor: 100,  cls: 'chip-blue',  label: '100' },
  { valor: 500,  cls: 'chip-green', label: '500' },
  { valor: 1000, cls: 'chip-black', label: '1K' },
  { valor: 5000, cls: 'chip-purple',label: '5K' },
]

function resultClass(estado) {
  if (WIN_STATES.includes(estado))  return 'bj-result-win'
  if (LOSE_STATES.includes(estado)) return 'bj-result-lose'
  return 'bj-result-draw'
}

export default function GamePage() {
  const { user, token } = useAuth()
  const [partida, setPartida]   = useState(null)
  const [apuesta, setApuesta]   = useState(100)
  const [balance, setBalance]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError]       = useState('')
  const [history, setHistory]   = useState([])
  const [showHistory, setShowHistory] = useState(false)

  const isActive = partida?.estado === 'ACTIVA'
  const isOver   = partida && partida.estado !== 'ACTIVA'

  const loadBalance = async () => {
    try {
      const res = await walletService.getBalance(user.id, token)
      setBalance(res?.saldo_creditos ?? res?.creditos ?? null)
    } catch {}
  }

  const loadHistory = async () => {
    try {
      const res = await gameService.history(user.id, token)
      setHistory(res?.partidas || [])
    } catch {}
  }

  useEffect(() => { loadBalance() }, [])

  const startGame = async () => {
    setError(''); setLoading(true)
    try {
      const res = await gameService.start(apuesta, token)
      setPartida(res)
      await loadBalance()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const doAction = async (action) => {
    setError(''); setActionLoading(true)
    try {
      let res
      if (action === 'hit')    res = await gameService.hit(partida.id, token)
      if (action === 'stand')  res = await gameService.stand(partida.id, token)
      if (action === 'abandon')res = await gameService.abandon(partida.id, token)
      setPartida(res)
      if (res?.estado !== 'ACTIVA') {
        await loadBalance()
        await loadHistory()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const reset = () => setPartida(null)

  const addChip = (v) => setApuesta(prev => prev + v)

  const estadoInfo = partida ? (ESTADO_LABELS[partida.estado] || { label: partida.estado, cls: 'badge-gray' }) : null

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>Mesa de Blackjack</h2>
          <p>Llega a 21 sin pasarte — vence al dealer</p>
        </div>
        <div className="flex items-center gap-2">
          {balance !== null && (
            <div className="stat-card" style={{ minWidth: '140px' }}>
              <div className="stat-label">Saldo</div>
              <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                {balance.toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>CR</span>
              </div>
            </div>
          )}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => { setShowHistory(h => !h); if (!showHistory) loadHistory() }}
          >
            {showHistory ? 'Ocultar' : 'Historial'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* ─── BLACKJACK TABLE ────────────────────────── */}
      <div className="bj-table" style={{ marginBottom: '1.5rem' }}>
        {/* Dealer hand */}
        <div>
          <div className="flex items-center gap-1" style={{ marginBottom: '0.5rem' }}>
            <span className="bj-hand-label">Dealer</span>
            {partida && isOver && (
              <span className="bj-points">{partida.manoDealer?.puntos}</span>
            )}
          </div>
          <div className="bj-hand">
            {partida ? (
              partida.manoDealer?.cartas.map((c, i) =>
                c.oculta
                  ? <PlayingCard key={i} hidden delay={i * 120} />
                  : <PlayingCard key={i} card={c} delay={i * 120} />
              )
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.1em', alignSelf: 'center' }}>
                Esperando partida...
              </span>
            )}
          </div>
        </div>

        {/* Result banner */}
        {isOver && estadoInfo && (
          <div className={`bj-result-banner ${resultClass(partida.estado)}`}>
            {estadoInfo.label}
            {partida.pago > 0 && (
              <span style={{ display: 'block', fontSize: '0.9rem', marginTop: '0.2rem', opacity: 0.8 }}>
                +{partida.pago.toLocaleString()} créditos
              </span>
            )}
          </div>
        )}

        {/* Player hand */}
        <div>
          <div className="flex items-center gap-1" style={{ marginBottom: '0.5rem' }}>
            <span className="bj-hand-label">Tu mano</span>
            {partida && (
              <span className="bj-points">{partida.manoJugador?.puntos}</span>
            )}
          </div>
          <div className="bj-hand">
            {partida ? (
              partida.manoJugador?.cartas.map((c, i) =>
                <PlayingCard key={i} card={c} delay={i * 150} />
              )
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.1em', alignSelf: 'center' }}>
                Las cartas aparecerán aquí
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── CONTROLS ───────────────────────────────── */}
      <div className="panel fade-in" style={{ marginBottom: '1.5rem' }}>
        {!partida || isOver ? (
          /* Pre-game / post-game controls */
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.6rem' }}>Apuesta</label>
              <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                <input
                  type="number" min={1}
                  value={apuesta}
                  onChange={e => setApuesta(Number(e.target.value))}
                  style={{ width: '120px' }}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => setApuesta(0)}>Limpiar</button>
              </div>
              <div className="flex gap-1" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {CHIPS.map(c => (
                  <button
                    key={c.valor}
                    className={`chip ${c.cls}`}
                    onClick={() => addChip(c.valor)}
                    title={`+${c.valor} créditos`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-gold btn-lg"
                onClick={startGame}
                disabled={loading || apuesta <= 0}
              >
                {loading ? <><span className="spinner" /> Repartiendo...</> : isOver ? '↺ Nueva Partida' : '🂡 Iniciar Partida'}
              </button>
              {isOver && (
                <button className="btn btn-outline" onClick={reset}>
                  Cambiar Apuesta
                </button>
              )}
            </div>
          </div>
        ) : (
          /* In-game controls */
          <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--text-dim)', marginRight: '0.5rem' }}>
              Apuesta: <strong style={{ color: 'var(--gold)' }}>{partida.apuesta?.toLocaleString()} CR</strong>
            </span>
            <button
              className="btn btn-gold btn-lg"
              onClick={() => doAction('hit')}
              disabled={actionLoading}
            >
              {actionLoading ? <span className="spinner" /> : '+ Pedir Carta'}
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => doAction('stand')}
              disabled={actionLoading}
            >
              ✋ Plantarse
            </button>
            <button
              className="btn btn-red"
              onClick={() => doAction('abandon')}
              disabled={actionLoading}
            >
              Abandonar
            </button>
          </div>
        )}
      </div>

      {/* ─── PAYOUT TABLE ───────────────────────────── */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div className="panel" style={{ flex: '1', minWidth: '260px' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', letterSpacing: '0.12em' }}>Tabla de Pagos</h3>
          <table>
            <tbody>
              {[
                ['Blackjack natural', 'apuesta × 2.5'],
                ['Jugador gana',      'apuesta × 2'],
                ['Dealer se pasa',    'apuesta × 2'],
                ['Empate',            'apuesta devuelta'],
                ['Jugador pierde',    '—'],
              ].map(([r, p]) => (
                <tr key={r}>
                  <td style={{ color: 'var(--text-dim)' }}>{r}</td>
                  <td style={{ textAlign: 'right', color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── HISTORY ───────────────────────────────── */}
        {showHistory && (
          <div className="panel fade-in" style={{ flex: '2', minWidth: '320px' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', letterSpacing: '0.12em' }}>Historial de Partidas</h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Sin partidas registradas.</p>
            ) : (
              <div className="table-wrap" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Resultado</th>
                      <th>Apuesta</th>
                      <th>Pago</th>
                      <th>Pts J / D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 20).map(p => {
                      const info = ESTADO_LABELS[p.estado] || { label: p.estado, cls: 'badge-gray' }
                      return (
                        <tr key={p.id}>
                          <td><span className={`badge ${info.cls}`}>{info.label}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{p.apuesta?.toLocaleString()}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: p.pago > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
                            {p.pago > 0 ? `+${p.pago.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                            {p.puntosJugador} / {p.puntosDealer}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}