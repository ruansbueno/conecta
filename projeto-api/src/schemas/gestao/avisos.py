import uuid
from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

from src.schemas.common import AutorOut, PessoaOut
from src.schemas.destino import DestinoIn, DestinoOut, DestinoVersaoOut, sem_repeticao

SituacaoGestao = Literal["ativo", "agendado", "arquivado", "excluido"]


class AvisoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    titulo: str = Field(min_length=3, max_length=150)
    conteudo: str = Field(min_length=1, max_length=5000)
    publicar_em: AwareDatetime | None = None
    destinos: list[DestinoIn] = Field(min_length=1, max_length=20)

    @field_validator("destinos")
    @classmethod
    def _destinos_unicos(cls, destinos: list[DestinoIn]) -> list[DestinoIn]:
        return sem_repeticao(destinos)


class AvisoPatch(BaseModel):
    """Parcial; `destinos`, se enviado, substitui a lista. `publicar_em: null` publica já."""

    model_config = ConfigDict(extra="forbid")

    titulo: str | None = Field(None, min_length=3, max_length=150)
    conteudo: str | None = Field(None, min_length=1, max_length=5000)
    publicar_em: AwareDatetime | None = None
    destinos: list[DestinoIn] | None = Field(None, min_length=1, max_length=20)

    @model_validator(mode="before")
    @classmethod
    def _ao_menos_um_campo(cls, dados):
        if isinstance(dados, dict):
            if not dados:
                raise ValueError("informe ao menos um campo")
            nulos = [
                c for c in ("titulo", "conteudo", "destinos") if c in dados and dados[c] is None
            ]
            if nulos:
                raise ValueError(f"{nulos[0]} não pode ser nulo")
        return dados

    @field_validator("destinos")
    @classmethod
    def _destinos_unicos(cls, destinos: list[DestinoIn] | None) -> list[DestinoIn] | None:
        return None if destinos is None else sem_repeticao(destinos)


class AvisoGestaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    conteudo: str
    autor: AutorOut
    situacao: str
    publicar_em: datetime | None
    publicado_em: datetime
    versao_atual: int
    criado_em: datetime
    editado_em: datetime | None
    arquivado_em: datetime | None
    destinos: list[DestinoOut]


class VersaoOut(BaseModel):
    versao: int
    titulo: str
    conteudo: str
    publicar_em: datetime | None
    destinos: list[DestinoVersaoOut]
    criada_por: PessoaOut
    criada_em: datetime


class EventoOut(BaseModel):
    id: uuid.UUID
    tipo: str
    usuario: PessoaOut
    ocorrido_em: datetime
    versao: int | None
    alteracoes: dict | None
