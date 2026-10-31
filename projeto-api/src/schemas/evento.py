import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from src.schemas.common import AutorOut
from src.schemas.destino import DestinoOut


class EventoOut(BaseModel):
    """Evento como os clientes o consultam (contracts E3 §1)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    descricao: str | None
    tipo: str
    inicio: datetime
    fim: datetime | None
    local: str | None
    autor: AutorOut
    situacao: Literal["ativo", "arquivado"]
    editado_em: datetime | None
    destinos: list[DestinoOut]
