from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app.models.admin_models import UsuarioSnapshot, Reporte, EstadoUsuario, TipoReporte
from app.models.schemas import CambioEstadoRequest, ReporteRequest
from app.kafka.producer import publish_admin_event


# ── Usuarios ─────────────────────────────────────────────────────

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


async def suspender_usuario(usuario_id: str, req: CambioEstadoRequest, db: Session) -> UsuarioSnapshot:
    usuario = get_usuario(usuario_id, db)
    if usuario.estado == EstadoUsuario.SUSPENDIDO:
        raise HTTPException(status_code=400, detail="El usuario ya está suspendido")

    usuario.estado = EstadoUsuario.SUSPENDIDO
    db.commit()
    db.refresh(usuario)

    await publish_admin_event({
        "event_type": "USUARIO_SUSPENDIDO",
        "usuario_id": usuario_id,
        "admin_id": req.admin_id,
        "nuevo_estado": EstadoUsuario.SUSPENDIDO,
        "timestamp": datetime.utcnow().isoformat(),
    })
    return usuario


async def activar_usuario(usuario_id: str, req: CambioEstadoRequest, db: Session) -> UsuarioSnapshot:
    usuario = get_usuario(usuario_id, db)
    if usuario.estado == EstadoUsuario.ACTIVO:
        raise HTTPException(status_code=400, detail="El usuario ya está activo")

    usuario.estado = EstadoUsuario.ACTIVO
    db.commit()
    db.refresh(usuario)

    await publish_admin_event({
        "event_type": "USUARIO_ACTIVADO",
        "usuario_id": usuario_id,
        "admin_id": req.admin_id,
        "nuevo_estado": EstadoUsuario.ACTIVO,
        "timestamp": datetime.utcnow().isoformat(),
    })
    return usuario


# ── Reportes ──────────────────────────────────────────────────────
# Los datos financieros vienen de la tabla transacciones del wallet-service
# que comparte el mismo schema MySQL. En microservicios "puros" se haría
# via API; aquí se accede directo a MySQL por practicidad académica.

def _query_transacciones(db: Session, inicio: datetime, fin: datetime) -> dict:
    """Agrega datos financieros del período desde la tabla compartida."""
    from sqlalchemy import text

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
        "balance_global":           apostados - ganados,  # ganancia de la casa
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
