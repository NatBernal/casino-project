import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { walletService } from '../services/api'

const TIPO_LABELS = {
  DEPOSITO:  { label: 'Depósito',  cls: 'badge-green' },
  RETIRO:    { label: 'Retiro',    cls: 'badge-red' },
  APUESTA:   { label: 'Apuesta',   cls: 'badge-yellow' },
  PAGO:      { label: 'Pago',      cls: 'badge-green' },
  GANANCIA:  { label: 'Ganancia',  cls: 'badge-green' },
}

export default function WalletPage() {
  const { user, token } = useAuth()
  const [wallet, setWallet]     = useState(null)
  const [txs, setTxs]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [modal, setModal]       = useState(null) // 'deposit' | 'withdraw' | null

  // Deposit form
  const [montoUsd, setMontoUsd] = useState('')
  // Withdraw form
  const [monto, setMonto]       = useState('')
  const [cuenta, setCuenta]     = useState('')
  const [opLoading, setOpLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [w, t] = await Promise.all([
        walletService.getBalance(user.id, token),
        walletService.getTransactions(user.id, token),
      ])
      setWallet(w)
      setTxs(Array.isArray(t) ? t : t?.transacciones || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const clearMessages = () => { setError(''); setSuccess('') }

  const handleDeposit = async (e) => {
    e.preventDefault(); clearMessages(); setOpLoading(true)
    try {
      await walletService.deposit(user.id, Number(montoUsd), token)
      setSuccess(`Depósito exitoso: $${montoUsd} USD → ${(Number(montoUsd) * 1000).toLocaleString()} créditos`)
      setMontoUsd(''); setModal(null); await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setOpLoading(false)
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault(); clearMessages(); setOpLoading(true)
    try {
      const res = await walletService.withdraw(user.id, Number(monto), cuenta, token)
      // Auto-execute withdrawal
      if (res?.solicitud_id || res?.id) {
        await walletService.execWithdraw(res.solicitud_id || res.id, token)
      }
      setSuccess(`Retiro de ${Number(monto).toLocaleString()} créditos procesado.`)
      setMonto(''); setCuenta(''); setModal(null); await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setOpLoading(false)
    }
  }

  const creditos = wallet?.saldo_creditos ?? wallet?.creditos ?? 0
  const usdEq    = (creditos / 1000).toFixed(2)

  return (
    <div>
      <div className="page-header">
        <h2>Billetera</h2>
        <p>Gestiona tus créditos y movimientos</p>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {loading ? (
        <div className="flex justify-center" style={{ padding: '3rem' }}><span className="spinner" /></div>
      ) : (
        <>
          {/* Balance cards */}
          <div className="stats-row" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-label">Saldo en créditos</div>
              <div className="stat-value">{creditos.toLocaleString()}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                ≈ USD {usdEq}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Transacciones</div>
              <div className="stat-value">{txs.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tasa de cambio</div>
              <div className="stat-value" style={{ fontSize: '1rem' }}>1 USD = 1,000 CR</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
            <button className="btn btn-gold btn-lg" onClick={() => { setModal('deposit'); clearMessages() }}>
              + Comprar Créditos
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => { setModal('withdraw'); clearMessages() }}>
              → Retirar
            </button>
          </div>

          {/* Transaction history */}
          <div className="panel">
            <h3 style={{ fontSize: '0.95rem', letterSpacing: '0.1em', marginBottom: '1.2rem' }}>
              Historial de Movimientos
            </h3>
            {txs.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Sin transacciones aún.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Monto USD</th>
                      <th>Créditos</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t, i) => {
                      const tipo = TIPO_LABELS[t.tipo] || { label: t.tipo, cls: 'badge-gray' }
                      return (
                        <tr key={t.transaccion_id || i}>
                          <td><span className={`badge ${tipo.cls}`}>{tipo.label}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                            {t.monto != null ? `$${Number(t.monto).toFixed(2)}` : '—'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--gold)' }}>
                            {t.monto_creditos != null ? Number(t.monto_creditos).toLocaleString() : '—'}
                          </td>
                          <td>
                            <span className={`badge ${t.estado === 'COMPLETADA' ? 'badge-green' : 'badge-yellow'}`}>
                              {t.estado || '—'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            {t.fecha ? new Date(t.fecha).toLocaleDateString('es-CO') : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── DEPOSIT MODAL ─── */}
      {modal === 'deposit' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Comprar Créditos</h3>
            <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Monto en USD</label>
                <input
                  type="number" min="1" step="0.01" required
                  value={montoUsd} onChange={e => setMontoUsd(e.target.value)}
                  placeholder="10.00"
                  autoFocus
                />
                {montoUsd > 0 && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--gold-dim)', marginTop: '0.3rem' }}>
                    Recibirás: {(Number(montoUsd) * 1000).toLocaleString()} créditos
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-gold btn-full" disabled={opLoading}>
                  {opLoading ? <span className="spinner" /> : 'Confirmar Compra'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── WITHDRAW MODAL ─── */}
      {modal === 'withdraw' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Solicitar Retiro</h3>
            <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Créditos a retirar</label>
                <input
                  type="number" min="1" required
                  value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder="5000"
                  autoFocus
                />
                {monto > 0 && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--gold-dim)', marginTop: '0.3rem' }}>
                    Equivale a: USD {(Number(monto) / 1000).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>Cuenta destino</label>
                <input
                  type="text" required
                  value={cuenta} onChange={e => setCuenta(e.target.value)}
                  placeholder="1234-5678-9012"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-gold btn-full" disabled={opLoading}>
                  {opLoading ? <span className="spinner" /> : 'Solicitar Retiro'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}