from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.wallet_models import Wallet, Transaccion, SolicitudRetiro, TipoTransaccion, EstadoTx
from app.models.schemas import DepositRequest, WithdrawRequest
from app.kafka.producer import publish_wallet_event


# ── Wallet ────────────────────────────────────────────────────────
def get_or_create_wallet(usuario_id: str, db: Session) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.usuario_id == usuario_id).first()
    if not wallet:
        wallet = Wallet(usuario_id=usuario_id)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


def get_wallet(usuario_id: str, db: Session) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.usuario_id == usuario_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet no encontrada")
    return wallet


# ── Depósito ──────────────────────────────────────────────────────
async def depositar(req: DepositRequest, db: Session) -> Transaccion:
    wallet = get_or_create_wallet(req.usuario_id, db)
    monto_creditos = req.monto_usd * wallet.tasa_cambio

    # Simula llamada a pasarela de pagos (ficticia)
    # En producción: await pasarela_client.cobrar(req.monto_usd)

    wallet.saldo_creditos += monto_creditos
    tx = Transaccion(
        wallet_id=wallet.wallet_id,
        tipo=TipoTransaccion.DEPOSITO,
        monto=req.monto_usd,
        monto_creditos=monto_creditos,
        estado=EstadoTx.COMPLETADA,
        descripcion=f"Compra de créditos: ${req.monto_usd} USD",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    await publish_wallet_event({
        "event_type": "DEPOSITO",
        "usuario_id": req.usuario_id,
        "wallet_id": wallet.wallet_id,
        "monto_creditos": monto_creditos,
        "transaccion_id": tx.transaccion_id,
        "timestamp": datetime.utcnow().isoformat(),
    })
    return tx


# ── Retiro ────────────────────────────────────────────────────────
async def solicitar_retiro(req: WithdrawRequest, db: Session) -> SolicitudRetiro:
    wallet = get_wallet(req.usuario_id, db)

    if wallet.saldo_creditos < req.monto_creditos:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")

    monto_usd = req.monto_creditos / wallet.tasa_cambio

    tx = Transaccion(
        wallet_id=wallet.wallet_id,
        tipo=TipoTransaccion.RETIRO,
        monto=monto_usd,
        monto_creditos=req.monto_creditos,
        estado=EstadoTx.PENDIENTE,
        descripcion=f"Solicitud de retiro a cuenta {req.cuenta_destino}",
    )
    db.add(tx)
    db.flush()

    solicitud = SolicitudRetiro(
        transaccion_id=tx.transaccion_id,
        cuenta_destino=req.cuenta_destino,
        estado=EstadoTx.PENDIENTE,
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)

    await publish_wallet_event({
        "event_type": "RETIRO_SOLICITADO",
        "usuario_id": req.usuario_id,
        "wallet_id": wallet.wallet_id,
        "monto_creditos": req.monto_creditos,
        "transaccion_id": tx.transaccion_id,
        "timestamp": datetime.utcnow().isoformat(),
    })
    return solicitud


async def ejecutar_retiro(solicitud_id: str, db: Session) -> SolicitudRetiro:
    """Llamada interna: ejecuta el retiro en la pasarela simulada."""
    solicitud = db.query(SolicitudRetiro).filter(
        SolicitudRetiro.solicitud_id == solicitud_id
    ).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if solicitud.estado != EstadoTx.PENDIENTE:
        raise HTTPException(status_code=400, detail="Solicitud ya procesada")

    tx = solicitud.transaccion
    wallet = tx.wallet

    # Debitar créditos
    wallet.saldo_creditos -= tx.monto_creditos
    solicitud.estado = EstadoTx.COMPLETADA
    tx.estado = EstadoTx.COMPLETADA
    solicitud.fecha_ejecucion = datetime.utcnow()
    db.commit()
    db.refresh(solicitud)

    await publish_wallet_event({
        "event_type": "RETIRO_COMPLETADO",
        "usuario_id": wallet.usuario_id,
        "wallet_id": wallet.wallet_id,
        "monto_creditos": tx.monto_creditos,
        "transaccion_id": tx.transaccion_id,
        "timestamp": datetime.utcnow().isoformat(),
    })
    return solicitud


# ── Historial ─────────────────────────────────────────────────────
def get_transacciones(usuario_id: str, db: Session) -> list[Transaccion]:
    wallet = get_wallet(usuario_id, db)
    return (
        db.query(Transaccion)
        .filter(Transaccion.wallet_id == wallet.wallet_id)
        .order_by(Transaccion.fecha.desc())
        .all()
    )
