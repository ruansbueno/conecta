import uuid
from datetime import datetime
from typing import Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    ValidationInfo,
    field_validator,
    model_validator,
)

from src.models.evento import TipoDeEvento
from src.schemas.common import AutorOut, PessoaOut
from src.schemas.destino import DestinoIn, DestinoOut, DestinoVersaoOut, sem_repeticao

SituacaoEventoGestao = Literal["ativo", "arquivado", "excluido"]


class EventoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    titulo: str = Field(min_length=3, max_length=150)
    descricao: str | None = Field(None, max_length=5000)
    tipo: TipoDeEvento
    inicio: AwareDatetime
    fim: AwareDatetime | None = None
    local: str | None = Field(None, max_length=120)
    destinos: list[DestinoIn] = Field(min_length=1, max_length=20)

    @field_validator("fim")
    @classmethod
    def _fim_depois_do_inicio(cls, fim: datetime | None, info: ValidationInfo):
        inicio = info.data.get("inicio")
        if fim is not None and inicio is not None and fim <= inicio:
            raise ValueError("deve ser maior que inicio")
        return fim

    @field_validator("destinos")
    @classmethod
    def _destinos_unicos(cls, destinos: list[DestinoIn]) -> list[DestinoIn]:
        return sem_repeticao(destinos)


class EventoPatch(BaseModel):
    """Parcial; `destinos`, se enviado, substitui a lista. `fim: null` torna o evento pontual.

    O `fim` é conferido no serviço, com o `inicio` resultante (plan D-E3-6).
    """

    model_config = ConfigDict(extra="forbid")

    titulo: str | None = Field(None, min_length=3, max_length=150)
    descricao: str | None = Field(None, max_length=5000)
    tipo: TipoDeEvento | None = None
    inicio: AwareDatetime | None = None
    fim: AwareDatetime | None = None
    local: str | None = Field(None, max_length=120)
    destinos: list[DestinoIn] | None = Field(None, min_length=1, max_length=20)

    @model_validator(mode="before")
    @classmethod
    def _ao_menos_um_campo(cls, dados):
        if isinstance(dados, dict):
            if not dados:
                raise ValueError("informe ao menos um campo")
            obrigatorios = ("titulo", "tipo", "inicio", "destinos")
            nulos = [c for c in obrigatorios if c in dados and dados[c] is None]
            if nulos:
                raise ValueError(f"{nulos[0]} não pode ser nulo")
        return dados

    @field_validator("destinos")
    @classmethod
    def _destinos_unicos(cls, destinos: list[DestinoIn] | None) -> list[DestinoIn] | None:
        return None if destinos is None else sem_repeticao(destinos)


class EventoGestaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    descricao: str | None
    tipo: str
    inicio: datetime
    fim: datetime | None
    local: str | None
    autor: AutorOut
    situacao: str
    versao_atual: int
    criado_em: datetime
    editado_em: datetime | None
    arquivado_em: datetime | None
    destinos: list[DestinoOut]


class VersaoEventoOut(BaseModel):
    versao: int
    titulo: str
    descricao: str | None
    tipo: str
    inicio: datetime
    fim: datetime | None
    local: str | None
    destinos: list[DestinoVersaoOut]
    criada_por: PessoaOut
    criada_em: datetime


class HistoricoEventoOut(BaseModel):
    id: uuid.UUID
    tipo: str
    usuario: PessoaOut
    ocorrido_em: datetime
    versao: int | None
    alteracoes: dict | None
