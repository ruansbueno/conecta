"""Destinos de aviso e de evento: um só formato de entrada e de saída (plan da E3, D-E3-1)."""

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

TipoDestino = Literal["todos", "turma", "semestre", "docentes"]


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


def sem_repeticao(destinos: list[DestinoIn]) -> list[DestinoIn]:
    if len({d.chave() for d in destinos}) != len(destinos):
        raise ValueError("destino repetido")
    return destinos


class TurmaDestinoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str


class DestinoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tipo: TipoDestino
    turma: TurmaDestinoOut | None
    semestre: int | None


class DestinoVersaoOut(BaseModel):
    """Destino como gravado numa versão (JSON canônico, sem o nome da turma)."""

    tipo: str
    turma_id: uuid.UUID | None
    semestre: int | None
