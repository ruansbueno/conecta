import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

StatusSolicitacao = Literal["pendente", "aprovada", "recusada", "cancelada"]


class TurmaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str
    nome: str
    semestre_curso: int
    periodo_letivo: str


class TurmaMinhaOut(TurmaOut):
    papel: str


class TurmaResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str
    nome: str


class SolicitacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    turma_id: uuid.UUID
    status: StatusSolicitacao
    solicitada_em: datetime


class SolicitacaoMinhaOut(BaseModel):
    id: uuid.UUID
    turma: TurmaResumoOut
    status: StatusSolicitacao
    solicitada_em: datetime
    decidida_em: datetime | None
    motivo_recusa: str | None
