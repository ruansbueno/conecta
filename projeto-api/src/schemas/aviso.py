import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from src.schemas.common import AutorOut
from src.schemas.destino import DestinoOut


class AvisoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    conteudo: str
    autor: AutorOut
    publicado_em: datetime
    editado_em: datetime | None
    situacao: Literal["ativo", "arquivado"]
    destinos: list[DestinoOut]
