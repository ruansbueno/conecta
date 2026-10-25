import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class AutorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str


class TurmaDestinoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str


class DestinoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tipo: Literal["todos", "turma", "semestre", "docentes"]
    turma: TurmaDestinoOut | None
    semestre: int | None


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
