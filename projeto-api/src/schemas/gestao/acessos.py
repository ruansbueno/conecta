import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from src.schemas.gestao.usuarios import PerfilIn

SituacaoPedido = Literal["pendente", "recusado"]


class DecisorOut(BaseModel):
    id: uuid.UUID
    nome: str


class AcessoOut(BaseModel):
    """Pedido de acesso de um servidor (tipo institucional administrativo) e a decisão sobre ele."""

    id: uuid.UUID
    username: str
    nome: str
    email: str | None
    tipo_institucional: str | None
    situacao: str
    perfil: str | None = None
    solicitado_em: datetime
    decidido_em: datetime | None
    decidido_por: DecisorOut | None


class AprovarAcessoIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    perfil: PerfilIn
