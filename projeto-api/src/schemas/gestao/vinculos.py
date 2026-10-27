import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

Papel = Literal["aluno", "docente"]


class UsuarioResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    nome: str


class VinculoOut(BaseModel):
    usuario: UsuarioResumoOut
    papel: str
    origem: str
    criado_em: datetime


class VinculoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    usuario_id: uuid.UUID
    papel: Papel
