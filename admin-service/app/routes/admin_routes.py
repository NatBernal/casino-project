from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.admin_models import EstadoUsuario
from app.models.schemas import (
    UsuarioSnapshotResponse, CambioEstadoRequest,
    ReporteRequest, ReporteResponse,
)
from app.services import admin_service
from app.services.auth_middleware import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Usuarios ──────────────────────────────────────────────────────

@router.get("/users", response_model=list[UsuarioSnapshotResponse])
def listar_usuarios(
    estado: Optional[EstadoUsuario] = Query(None, description="Filtrar por estado"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """GET /admin/users — Lista todos los usuarios (con filtro opcional por estado)."""
    return admin_service.listar_usuarios(db, estado, skip, limit)


@router.get("/users/{usuario_id}", response_model=UsuarioSnapshotResponse)
def get_usuario(
    usuario_id: str,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """GET /admin/users/{usuario_id} — Detalle de un usuario."""
    return admin_service.get_usuario(usuario_id, db)


@router.put("/users/{usuario_id}/suspend", response_model=UsuarioSnapshotResponse)
async def suspender_usuario(
    usuario_id: str,
    req: CambioEstadoRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """PUT /admin/users/{usuario_id}/suspend — Suspende la cuenta de un usuario."""
    return await admin_service.suspender_usuario(usuario_id, req, db)


@router.put("/users/{usuario_id}/activate", response_model=UsuarioSnapshotResponse)
async def activar_usuario(
    usuario_id: str,
    req: CambioEstadoRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """PUT /admin/users/{usuario_id}/activate — Activa la cuenta de un usuario."""
    return await admin_service.activar_usuario(usuario_id, req, db)


# ── Reportes ──────────────────────────────────────────────────────

@router.post("/reports", response_model=ReporteResponse, status_code=201)
def generar_reporte(
    req: ReporteRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """POST /admin/reports — Genera un reporte financiero del período indicado."""
    return admin_service.generar_reporte(req, db)


@router.get("/reports", response_model=list[ReporteResponse])
def listar_reportes(
    admin_id: str = Query(..., description="ID del administrador"),
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """GET /admin/reports — Lista los reportes generados por un administrador."""
    return admin_service.listar_reportes(admin_id, db)


@router.get("/reports/{reporte_id}", response_model=ReporteResponse)
def get_reporte(
    reporte_id: str,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """GET /admin/reports/{reporte_id} — Detalle de un reporte."""
    return admin_service.get_reporte(reporte_id, db)
