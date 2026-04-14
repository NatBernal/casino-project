import uuid
from datetime import datetime
from sqlalchemy import Column, String, Double, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import enum

from app.db.database import Base


# ── Enumeraciones ────────────────────────────────────────────────
class TipoTransaccion(str, enum.Enum):
    DEPOSITO = "DEPOSITO"
    RETIRO = "RETIRO"
    APUESTA = "APUESTA"
    GANANCIA = "GANANCIA"


class EstadoTx(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    COMPLETADA = "COMPLETADA"
    FALLIDA = "FALLIDA"


# ── Wallet ───────────────────────────────────────────────────────
class Wallet(Base):
    __tablename__ = "wallets"

    wallet_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    usuario_id = Column(String(36), nullable=False, unique=True, index=True)
    saldo_creditos = Column(Double, default=0.0, nullable=False)
    tasa_cambio = Column(Double, default=1000.0, nullable=False)   # 1 USD = 1000 créditos
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transacciones = relationship("Transaccion", back_populates="wallet", cascade="all, delete-orphan")


# ── Transaccion ──────────────────────────────────────────────────
class Transaccion(Base):
    __tablename__ = "transacciones"

    transaccion_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_id = Column(String(36), ForeignKey("wallets.wallet_id"), nullable=False, index=True)
    tipo = Column(Enum(TipoTransaccion), nullable=False)
    monto = Column(Double, nullable=False)           # en USD
    monto_creditos = Column(Double, nullable=False)  # en créditos
    estado = Column(Enum(EstadoTx), default=EstadoTx.PENDIENTE)
    fecha = Column(DateTime, default=datetime.utcnow)
    descripcion = Column(String(255))

    wallet = relationship("Wallet", back_populates="transacciones")
    solicitud_retiro = relationship("SolicitudRetiro", back_populates="transaccion", uselist=False)


# ── SolicitudRetiro ──────────────────────────────────────────────
class SolicitudRetiro(Base):
    __tablename__ = "solicitudes_retiro"

    solicitud_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaccion_id = Column(String(36), ForeignKey("transacciones.transaccion_id"), nullable=False)
    cuenta_destino = Column(String(100), nullable=False)
    estado = Column(Enum(EstadoTx), default=EstadoTx.PENDIENTE)
    fecha_solicitud = Column(DateTime, default=datetime.utcnow)
    fecha_ejecucion = Column(DateTime, nullable=True)

    transaccion = relationship("Transaccion", back_populates="solicitud_retiro")
