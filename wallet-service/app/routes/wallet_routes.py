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
    return wallet_service.get_wallet(usuario_id, db)


@router.post("/deposit", response_model=TransaccionResponse, status_code=201)
def depositar(
    req: DepositRequest,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token),
):
    return wallet_service.depositar(req, db)


@router.post("/withdraw", response_model=SolicitudRetiroResponse, status_code=202)
def solicitar_retiro(
    req: WithdrawRequest,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token),
):
    return wallet_service.solicitar_retiro(req, db)


@router.put("/withdraw/{solicitud_id}/exec", response_model=SolicitudRetiroResponse)
def ejecutar_retiro(
    solicitud_id: str,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token),
):
    return wallet_service.ejecutar_retiro(solicitud_id, db)


@router.get("/transactions/{usuario_id}", response_model=list[TransaccionResponse])
def historial_transacciones(
    usuario_id: str,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token),
):
    return wallet_service.get_transacciones(usuario_id, db)
