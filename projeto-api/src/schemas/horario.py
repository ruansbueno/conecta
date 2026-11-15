import re
import uuid
from datetime import time
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, PlainSerializer

from src.schemas.common import PessoaOut

_HHMM = re.compile(r"([01]\d|2[0-3]):[0-5]\d")


def _hora(valor):
    if isinstance(valor, time):
        return valor
    if not isinstance(valor, str) or not _HHMM.fullmatch(valor):
        raise ValueError("deve estar no formato HH:MM")
    return time.fromisoformat(valor)


# Hora local da grade, sem data: entra e sai como "HH:MM" (contracts E3 §3).
Hora = Annotated[
    time, BeforeValidator(_hora), PlainSerializer(lambda h: h.strftime("%H:%M"), return_type=str)
]


class HorarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    turma_id: uuid.UUID
    dia_semana: int
    inicio: Hora
    fim: Hora
    disciplina: str
    local: str | None
    docente: PessoaOut | None


class TurmaResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str
    nome: str


class AulaDoDocenteOut(HorarioOut):
    """Aula de `GET /horarios/minhas` (RF-54): a da grade, com a turma."""

    turma: TurmaResumoOut


class TurmaConflitoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str
    nome: str


class ConflitoOut(BaseModel):
    tipo: str
    local: str | None
    horario_id: uuid.UUID
    turma: TurmaConflitoOut
    inicio: Hora
    fim: Hora
