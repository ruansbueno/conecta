import uuid
from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

from src.schemas.aviso import AutorOut, DestinoOut

TipoDestino = Literal["todos", "turma", "semestre", "docentes"]
SituacaoGestao = Literal["ativo", "agendado", "arquivado", "excluido"]


class DestinoIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: TipoDestino
    turma_id: uuid.UUID | None = None
    semestre: int | None = Field(None, ge=1, le=12)

    @model_validator(mode="after")
    def _referencia_coerente(self):
        if self.tipo == "turma" and (self.turma_id is None or self.semestre is not None):
            raise ValueError("destino turma exige turma_id e não aceita semestre")
        if self.tipo == "semestre" and (self.semestre is None or self.turma_id is not None):
            raise ValueError("destino semestre exige semestre e não aceita turma_id")
        if self.tipo in ("todos", "docentes") and (
            self.turma_id is not None or self.semestre is not None
        ):
            raise ValueError(f"destino {self.tipo} não aceita turma_id nem semestre")
        return self

    def chave(self) -> tuple:
        return (self.tipo, self.turma_id, self.semestre)


def _sem_repeticao(destinos: list[DestinoIn]) -> list[DestinoIn]:
    if len({d.chave() for d in destinos}) != len(destinos):
        raise ValueError("destino repetido")
    return destinos


class AvisoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    titulo: str = Field(min_length=3, max_length=150)
    conteudo: str = Field(min_length=1, max_length=5000)
    publicar_em: AwareDatetime | None = None
    destinos: list[DestinoIn] = Field(min_length=1, max_length=20)

    @field_validator("destinos")
    @classmethod
    def _destinos_unicos(cls, destinos: list[DestinoIn]) -> list[DestinoIn]:
        return _sem_repeticao(destinos)


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
        return None if destinos is None else _sem_repeticao(destinos)


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
