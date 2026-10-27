import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

_PERIODO = r"^\d{4}/[12]$"


class TurmaCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo: str = Field(min_length=1, max_length=40)
    nome: str = Field(min_length=3, max_length=120)
    semestre_curso: int = Field(ge=1, le=12)
    periodo_letivo: str = Field(pattern=_PERIODO)
    inscricoes_abertas: bool = False


class TurmaPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo: str | None = Field(None, min_length=1, max_length=40)
    nome: str | None = Field(None, min_length=3, max_length=120)
    semestre_curso: int | None = Field(None, ge=1, le=12)
    periodo_letivo: str | None = Field(None, pattern=_PERIODO)
    inscricoes_abertas: bool | None = None
    ativa: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def _ao_menos_um_campo_sem_nulos(cls, dados):
        if isinstance(dados, dict):
            if not dados:
                raise ValueError("informe ao menos um campo")
            nulos = [c for c, v in dados.items() if v is None]
            if nulos:
                raise ValueError(f"{nulos[0]} não pode ser nulo")
        return dados


class TurmaGestaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str
    nome: str
    semestre_curso: int
    periodo_letivo: str
    inscricoes_abertas: bool
    ativa: bool
    criado_em: datetime
    atualizado_em: datetime
    total_alunos: int = 0
    total_docentes: int = 0
