import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

from src.schemas.usuario import TurmaDoUsuarioOut

PerfilIn = Literal["administrador", "coordenacao", "docente", "aluno"]


class UsuarioGestaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    nome: str
    perfil: str
    ativo: bool
    ultimo_login_em: datetime | None


class UsuarioGestaoDetalheOut(UsuarioGestaoOut):
    turmas: list[TurmaDoUsuarioOut]


class UsuarioPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    perfil: PerfilIn | None = None
    ativo: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def _ao_menos_um_campo(cls, dados):
        if isinstance(dados, dict):
            if not dados:
                raise ValueError("informe ao menos um campo: perfil ou ativo")
            for campo in ("perfil", "ativo"):
                if campo in dados and dados[campo] is None:
                    raise ValueError(f"{campo} não pode ser nulo")
        return dados
