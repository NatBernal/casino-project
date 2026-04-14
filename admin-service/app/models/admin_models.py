import uuid
from datetime import datetime
from sqlalchemy import Column, String, Enum, DateTime, Double, Boolean
import enum

from app.db.database import Base


class EstadoUsuario(str, enum.Enum):
    ACTIVO = "ACTIVO"
    SUSPENDIDO = "SUSPENDIDO"
    PENDIENTE_VERIFICACION = "PENDIENTE_VERIFICACION"


class TipoReporte(str, enum.Enum):
    DIARIO = "DIARIO"
    SEMANAL = "SEMANAL"
    MENSUAL = "MENSUAL"


# ── UsuarioSnapshot ───────────────────────────────────────────────
# Replica local de datos de usuario que admin necesita.
# Se actualiza consumiendo eventos Kafka de auth-service.
class UsuarioSnapshot(Base):
    __tablename__ = "usuarios_snapshot"

    usuario_id = Column(String(36), primary_key=True)
    nombre = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    estado = Column(Enum(EstadoUsuario), default=EstadoUsuario.PENDIENTE_VERIFICACION)
    mfa_habilitado = Column(Boolean, default=False)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Reporte ───────────────────────────────────────────────────────
class Reporte(Base):
    __tablename__ = "reportes"

    reporte_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    generado_por = Column(String(36), nullable=False)   # adminId
    tipo = Column(Enum(TipoReporte), nullable=False)
    periodo_inicio = Column(DateTime, nullable=False)
    periodo_fin = Column(DateTime, nullable=False)
    total_creditos_comprados = Column(Double, default=0.0)
    total_creditos_apostados = Column(Double, default=0.0)
    total_creditos_ganados = Column(Double, default=0.0)
    balance_global = Column(Double, default=0.0)
    fecha_generacion = Column(DateTime, default=datetime.utcnow)
