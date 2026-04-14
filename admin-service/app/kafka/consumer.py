import asyncio
import json
import logging
from aiokafka import AIOKafkaConsumer
from sqlalchemy.orm import Session

from app.config import settings
from app.db.database import SessionLocal
from app.models.admin_models import UsuarioSnapshot, EstadoUsuario

logger = logging.getLogger(__name__)

# admin-service escucha dos topics:
#   auth-events   → altas, cambios de estado desde auth-service
#   wallet-events → movimientos financieros (para acumular en reportes)
TOPICS = ["auth-events", "wallet-events"]
GROUP_ID = "admin-service-group"


def _upsert_usuario(data: dict, db: Session):
    """Mantiene el snapshot local de usuarios sincronizado con auth-service."""
    usuario_id = data.get("usuario_id")
    if not usuario_id:
        return

    usuario = db.query(UsuarioSnapshot).filter(
        UsuarioSnapshot.usuario_id == usuario_id
    ).first()

    event_type = data.get("event_type", "")

    if event_type == "USUARIO_REGISTRADO":
        if not usuario:
            usuario = UsuarioSnapshot(
                usuario_id=usuario_id,
                nombre=data.get("nombre", ""),
                email=data.get("email", ""),
                estado=EstadoUsuario.PENDIENTE_VERIFICACION,
                mfa_habilitado=data.get("mfa_habilitado", False),
            )
            db.add(usuario)
    elif event_type in ("USUARIO_ACTIVADO", "MFA_VERIFICADO"):
        if usuario:
            usuario.estado = EstadoUsuario.ACTIVO
    elif event_type == "USUARIO_SUSPENDIDO":
        if usuario:
            usuario.estado = EstadoUsuario.SUSPENDIDO

    db.commit()


async def _process_message(topic: str, data: dict, db: Session):
    if topic == "auth-events":
        _upsert_usuario(data, db)
    # wallet-events se usan en la generación de reportes (queries directas a MySQL)
    # No se almacenan en snapshot; se agregan al vuelo en admin_service.py


async def start_consumer():
    consumer = AIOKafkaConsumer(
        *TOPICS,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=GROUP_ID,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
    )
    await consumer.start()
    logger.info("Kafka consumer started on topics: %s", TOPICS)
    try:
        async for msg in consumer:
            db = SessionLocal()
            try:
                await _process_message(msg.topic, msg.value, db)
            except Exception as e:
                logger.error("Error processing message [%s]: %s", msg.topic, e)
                db.rollback()
            finally:
                db.close()
    finally:
        await consumer.stop()
