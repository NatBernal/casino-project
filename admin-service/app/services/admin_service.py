from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

from app.models.admin_models import UsuarioSnapshot, Reporte, EstadoUsuario
from app.models.schemas import CambioEstadoRequest, ReporteRequest


# ── Usuarios ──────────────────────────────────────────────────────

def listar_usuarios(
    db: Session,
    estado: EstadoUsuario | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[UsuarioSnapshot]:
    q = db.query(UsuarioSnapshot)
    if estado:
        q = q.filter(UsuarioSnapshot.estado == estado)
    return q.order_by(UsuarioSnapshot.fecha_registro.desc()).offset(skip).limit(limit).all()


def get_usuario(usuario_id: str, db: Session) -> UsuarioSnapshot:
    u = db.query(UsuarioSnapshot).filter(UsuarioSnapshot.usuario_id == usuario_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return u


def suspender_usuario(usuario_id: str, req: CambioEstadoRequest, db: Session) -> UsuarioSnapshot:
    usuario = get_usuario(usuario_id, db)
    if usuario.estado == EstadoUsuario.SUSPENDIDO:
        raise HTTPException(status_code=400, detail="El usuario ya está suspendido")
    usuario.estado = EstadoUsuario.SUSPENDIDO
    db.commit()
    db.refresh(usuario)
    return usuario


def activar_usuario(usuario_id: str, req: CambioEstadoRequest, db: Session) -> UsuarioSnapshot:
    usuario = get_usuario(usuario_id, db)
    if usuario.estado == EstadoUsuario.ACTIVO:
        raise HTTPException(status_code=400, detail="El usuario ya está activo")
    usuario.estado = EstadoUsuario.ACTIVO
    db.commit()
    db.refresh(usuario)
    return usuario


# ── Reportes ──────────────────────────────────────────────────────

def _query_transacciones(db: Session, inicio: datetime, fin: datetime) -> dict:
    resultado = db.execute(text("""
        SELECT
            SUM(CASE WHEN tipo = 'DEPOSITO'  THEN monto_creditos ELSE 0 END) AS comprados,
            SUM(CASE WHEN tipo = 'APUESTA'   THEN monto_creditos ELSE 0 END) AS apostados,
            SUM(CASE WHEN tipo = 'GANANCIA'  THEN monto_creditos ELSE 0 END) AS ganados
        FROM transacciones
        WHERE fecha BETWEEN :inicio AND :fin
          AND estado = 'COMPLETADA'
    """), {"inicio": inicio, "fin": fin}).fetchone()

    comprados = float(resultado.comprados or 0)
    apostados = float(resultado.apostados or 0)
    ganados   = float(resultado.ganados or 0)

    return {
        "total_creditos_comprados": comprados,
        "total_creditos_apostados": apostados,
        "total_creditos_ganados":   ganados,
        "balance_global":           apostados - ganados,
    }


def generar_reporte(req: ReporteRequest, db: Session) -> Reporte:
    datos = _query_transacciones(db, req.periodo_inicio, req.periodo_fin)
    reporte = Reporte(
        generado_por=req.admin_id,
        tipo=req.tipo,
        periodo_inicio=req.periodo_inicio,
        periodo_fin=req.periodo_fin,
        **datos,
    )
    db.add(reporte)
    db.commit()
    db.refresh(reporte)
    return reporte


def listar_reportes(admin_id: str, db: Session) -> list[Reporte]:
    return (
        db.query(Reporte)
        .filter(Reporte.generado_por == admin_id)
        .order_by(Reporte.fecha_generacion.desc())
        .all()
    )


def get_reporte(reporte_id: str, db: Session) -> Reporte:
    r = db.query(Reporte).filter(Reporte.reporte_id == reporte_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return r
