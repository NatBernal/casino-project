from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.schemas import (
    WalletResponse, DepositRequest, WithdrawRequest,
    TransaccionResponse, SolicitudRetiroResponse,
)
from app.services import wallet_service
from app.services.auth_middleware import verify_token

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("/{usuario_id}", response_model=WalletResponse)
def consultar_saldo(
    usuario_id: str,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token),
):
    """GET /wallet/{usuario_id} — Consulta saldo de créditos."""
    return wallet_service.get_wallet(usuario_id, db)


@router.post("/deposit", response_model=TransaccionResponse, status_code=201)
async def depositar(
    req: DepositRequest,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token),
):
    """POST /wallet/deposit — Compra créditos (simula pasarela de pagos)."""
    return await wallet_service.depositar(req, db)


@router.post("/withdraw", response_model=SolicitudRetiroResponse, status_code=202)
async def solicitar_retiro(
    req: WithdrawRequest,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token),
):
    """POST /wallet/withdraw — Solicita retiro de créditos."""
    return await wallet_service.solicitar_retiro(req, db)


@router.put("/withdraw/{solicitud_id}/exec", response_model=SolicitudRetiroResponse)
async def ejecutar_retiro(
    solicitud_id: str,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token),
):
    """PUT /wallet/withdraw/{solicitud_id}/exec — Ejecuta retiro (llamada interna)."""
    return await wallet_service.ejecutar_retiro(solicitud_id, db)


@router.get("/transactions/{usuario_id}", response_model=list[TransaccionResponse])
def historial_transacciones(
    usuario_id: str,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token),
):
    """GET /wallet/transactions/{usuario_id} — Historial de transacciones."""
    return wallet_service.get_transacciones(usuario_id, db)
