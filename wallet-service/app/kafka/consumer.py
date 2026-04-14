import asyncio
import json
import logging
from datetime import datetime
from aiokafka import AIOKafkaConsumer
from sqlalchemy.orm import Session

from app.config import settings
from app.db.database import SessionLocal
from app.models.wallet_models import Wallet, Transaccion, TipoTransaccion, EstadoTx
from app.kafka.producer import publish_wallet_event

logger = logging.getLogger(__name__)

TOPIC_GAME_CREDITS = "game-credits"
GROUP_ID = "wallet-service-group"


async def _process_message(data: dict, db: Session):
    """
    Mensajes esperados desde game-service:
      { "event_type": "APUESTA", "usuario_id": "...", "monto_creditos": 100 }
      { "event_type": "GANANCIA", "usuario_id": "...", "monto_creditos": 200 }
    """
    event_type = data.get("event_type")
    usuario_id = data.get("usuario_id")
    monto = float(data.get("monto_creditos", 0))

    wallet = db.query(Wallet).filter(Wallet.usuario_id == usuario_id).first()
    if not wallet:
        logger.warning("Wallet not found for usuario_id=%s", usuario_id)
        return

    if event_type == "APUESTA":
        if wallet.saldo_creditos < monto:
            logger.warning("Saldo insuficiente para apuesta de %s", usuario_id)
            return
        wallet.saldo_creditos -= monto
        tipo = TipoTransaccion.APUESTA

    elif event_type == "GANANCIA":
        wallet.saldo_creditos += monto
        tipo = TipoTransaccion.GANANCIA
    else:
        return

    tx = Transaccion(
        wallet_id=wallet.wallet_id,
        tipo=tipo,
        monto=monto / wallet.tasa_cambio,
        monto_creditos=monto,
        estado=EstadoTx.COMPLETADA,
        descripcion=f"{event_type} vía game-service",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    await publish_wallet_event({
        "event_type": f"{event_type}_PROCESADA",
        "usuario_id": usuario_id,
        "wallet_id": wallet.wallet_id,
        "monto_creditos": monto,
        "transaccion_id": tx.transaccion_id,
        "timestamp": datetime.utcnow().isoformat(),
    })


async def start_consumer():
    consumer = AIOKafkaConsumer(
        TOPIC_GAME_CREDITS,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=GROUP_ID,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
    )
    await consumer.start()
    logger.info("Kafka consumer started on topic: %s", TOPIC_GAME_CREDITS)
    try:
        async for msg in consumer:
            db = SessionLocal()
            try:
                await _process_message(msg.value, db)
            except Exception as e:
                logger.error("Error processing message: %s", e)
                db.rollback()
            finally:
                db.close()
    finally:
        await consumer.stop()
