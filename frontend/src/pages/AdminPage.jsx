import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { adminService } from '../services/api'

const ESTADOS = ['', 'ACTIVO', 'SUSPENDIDO']

export default function AdminPage() {
  const { user, token } = useAuth()
  const [users, setUsers]   = useState([])
  const [reports, setReports] = useState([])
  const [tab, setTab]       = useState('users') // 'users' | 'reports'
  const [estadoFilter, setEstadoFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [opLoading, setOpLoading] = useState('')
  const [error, setError]   = useState('')
  const [success, setSuccess]= useState('')
  const [reportModal, setReportModal] = useState(false)

  // Report form
  const [rTipo, setRTipo]   = useState('MENSUAL')
  const [rInicio, setRInicio] = useState('2026-04-01T00:00:00')
  const [rFin, setRFin]     = useState('2026-04-30T23:59:59')

  const loadUsers = async () => {
    setLoading(true); setError('')
    try {
      const res = await adminService.getUsers(estadoFilter || undefined, token)
      setUsers(Array.isArray(res) ? res : res?.usuarios || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadReports = async () => {
    setLoading(true); setError('')
    try {
      const res = await adminService.getReports(user.id, token)
      setReports(Array.isArray(res) ? res : res?.reportes || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'users')   loadUsers()
    if (tab === 'reports') loadReports()
  }, [tab, estadoFilter])

  const handleSuspend = async (userId) => {
    setOpLoading(userId); setError(''); setSuccess('')
    try {
      await adminService.suspendUser(userId, user.id, token)
      setSuccess('Usuario suspendido.')
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setOpLoading('')
    }
  }

  const handleActivate = async (userId) => {
    setOpLoading(userId); setError(''); setSuccess('')
    try {
      await adminService.activateUser(userId, user.id, token)
      setSuccess('Usuario activado.')
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setOpLoading('')
    }
  }

  const handleReport = async (e) => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      await adminService.generateReport(user.id, rTipo, rInicio, rFin, token)
      setSuccess('Reporte generado exitosamente.')
      setReportModal(false)
      await loadReports()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>Panel de Administración</h2>
          <p>Gestión de usuarios y reportes financieros</p>
        </div>
        <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>ADMIN</span>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {/* Tabs */}
      <div className="flex gap-1" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${tab === 'users' ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => setTab('users')}
        >
          👥 Usuarios
        </button>
        <button
          className={`btn ${tab === 'reports' ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => setTab('reports')}
        >
          📊 Reportes
        </button>
      </div>

      {/* ─── USERS TAB ─────────────────────────────── */}
      {tab === 'users' && (
        <div>
          <div className="flex gap-2 items-center" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', flex: '0 0 auto' }}>
              <label style={{ marginBottom: 0 }}>Filtrar por estado:</label>
              <select
                value={estadoFilter}
                onChange={e => setEstadoFilter(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="">Todos</option>
                <option value="ACTIVO">Activo</option>
                <option value="SUSPENDIDO">Suspendido</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center" style={{ padding: '3rem' }}><span className="spinner" /></div>
          ) : (
            <div className="panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>ID</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Sin usuarios.</td></tr>
                    ) : users.map(u => {
                      const isActive = (u.estado || u.status) === 'ACTIVO'
                      const isSelf   = u.id === user.id
                      return (
                        <tr key={u.id}>
                          <td>{u.email}</td>
                          <td>
                            <span className={`badge ${u.role === 'ADMIN' ? 'badge-yellow' : 'badge-gray'}`}>
                              {u.role || u.rol || '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${isActive ? 'badge-green' : 'badge-red'}`}>
                              {u.estado || u.status || '—'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {u.id?.slice(0, 12)}…
                          </td>
                          <td>
                            {isSelf ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>—</span>
                            ) : isActive ? (
                              <button
                                className="btn btn-red btn-sm"
                                disabled={opLoading === u.id}
                                onClick={() => handleSuspend(u.id)}
                              >
                                {opLoading === u.id ? <span className="spinner" /> : 'Suspender'}
                              </button>
                            ) : (
                              <button
                                className="btn btn-outline btn-sm"
                                disabled={opLoading === u.id}
                                onClick={() => handleActivate(u.id)}
                              >
                                {opLoading === u.id ? <span className="spinner" /> : 'Activar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── REPORTS TAB ───────────────────────────── */}
      {tab === 'reports' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-gold" onClick={() => setReportModal(true)}>
              + Generar Reporte
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center" style={{ padding: '3rem' }}><span className="spinner" /></div>
          ) : (
            <div className="panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Período inicio</th>
                      <th>Período fin</th>
                      <th>Estado</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Sin reportes generados.</td></tr>
                    ) : reports.map((r, i) => (
                      <tr key={r.id || i}>
                        <td><span className="badge badge-yellow">{r.tipo || '—'}</span></td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                          {r.periodo_inicio ? new Date(r.periodo_inicio).toLocaleDateString('es-CO') : '—'}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                          {r.periodo_fin ? new Date(r.periodo_fin).toLocaleDateString('es-CO') : '—'}
                        </td>
                        <td>
                          <span className={`badge ${r.estado === 'COMPLETADO' ? 'badge-green' : 'badge-yellow'}`}>
                            {r.estado || 'GENERADO'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {r.id ? r.id.slice(0, 12) + '…' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── REPORT MODAL ──────────────────────────── */}
      {reportModal && (
        <div className="modal-overlay" onClick={() => setReportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Generar Reporte Financiero</h3>
            <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Tipo de reporte</label>
                <select value={rTipo} onChange={e => setRTipo(e.target.value)}>
                  <option value="MENSUAL">Mensual</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="ANUAL">Anual</option>
                </select>
              </div>
              <div className="form-group">
                <label>Período inicio</label>
                <input
                  type="text" required
                  value={rInicio} onChange={e => setRInicio(e.target.value)}
                  placeholder="2026-04-01T00:00:00"
                />
              </div>
              <div className="form-group">
                <label>Período fin</label>
                <input
                  type="text" required
                  value={rFin} onChange={e => setRFin(e.target.value)}
                  placeholder="2026-04-30T23:59:59"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-gold btn-full">Generar</button>
                <button type="button" className="btn btn-ghost" onClick={() => setReportModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}