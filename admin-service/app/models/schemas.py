from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.admin_models import EstadoUsuario, TipoReporte


class UsuarioSnapshotResponse(BaseModel):
    usuario_id: str
    nombre: str
    email: str
    estado: EstadoUsuario
    mfa_habilitado: bool
    fecha_registro: datetime
    fecha_actualizacion: datetime

    model_config = {"from_attributes": True}


class CambioEstadoRequest(BaseModel):
    admin_id: str


class ReporteRequest(BaseModel):
    admin_id: str
    tipo: TipoReporte
    periodo_inicio: datetime
    periodo_fin: datetime


class ReporteResponse(BaseModel):
    reporte_id: str
    generado_por: str
    tipo: TipoReporte
    periodo_inicio: datetime
    periodo_fin: datetime
    total_creditos_comprados: float
    total_creditos_apostados: float
    total_creditos_ganados: float
    balance_global: float
    fecha_generacion: datetime

    model_config = {"from_attributes": True}


# Payload que admin-service publica en Kafka al cambiar estado de usuario
class KafkaAdminEvent(BaseModel):
    event_type: str          # "USUARIO_SUSPENDIDO" | "USUARIO_ACTIVADO"
    usuario_id: str
    admin_id: str
    nuevo_estado: str
    timestamp: str
