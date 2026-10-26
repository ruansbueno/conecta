import uuid

from pydantic import BaseModel, ConfigDict


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    nome: str
    perfil: str


class TurmaDoUsuarioOut(BaseModel):
    id: uuid.UUID
    codigo: str
    nome: str
    papel: str


class MeOut(UsuarioOut):
    turmas: list[TurmaDoUsuarioOut]
