import uuid

from pydantic import BaseModel, ConfigDict


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    nome: str
    perfil: str
