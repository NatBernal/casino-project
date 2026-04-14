from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.wallet_models import TipoTransaccion, EstadoTx


class WalletResponse(BaseModel):
    wallet_id: str
    usuario_id: str
    saldo_creditos: float
    tasa_cambio: float
    fecha_actualizacion: datetime

    model_config = {"from_attributes": True}


class DepositRequest(BaseModel):
    usuario_id: str
    monto_usd: float = Field(..., gt=0, description="Monto en USD a depositar")


class WithdrawRequest(BaseModel):
    usuario_id: str
    monto_creditos: float = Field(..., gt=0, description="Créditos a retirar")
    cuenta_destino: str = Field(..., min_length=5)


class TransaccionResponse(BaseModel):
    transaccion_id: str
    wallet_id: str
    tipo: TipoTransaccion
    monto: float
    monto_creditos: float
    estado: EstadoTx
    fecha: datetime
    descripcion: Optional[str]

    model_config = {"from_attributes": True}


class SolicitudRetiroResponse(BaseModel):
    solicitud_id: str
    transaccion_id: str
    cuenta_destino: str
    estado: EstadoTx
    fecha_solicitud: datetime
    fecha_ejecucion: Optional[datetime]

    model_config = {"from_attributes": True}


# Payload publicado en Kafka
class KafkaWalletEvent(BaseModel):
    event_type: str          # "DEPOSITO", "RETIRO_SOLICITADO", "RETIRO_COMPLETADO", etc.
    usuario_id: str
    wallet_id: str
    monto_creditos: float
    transaccion_id: str
    timestamp: str
