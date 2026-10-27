import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.schemas.gestao.vinculos import UsuarioResumoOut
from src.schemas.turma import StatusSolicitacao, TurmaResumoOut


class DecisorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str


class SolicitacaoGestaoOut(BaseModel):
    id: uuid.UUID
    aluno: UsuarioResumoOut
    turma: TurmaResumoOut
    status: StatusSolicitacao
    solicitada_em: datetime
    decidida_em: datetime | None
    decidida_por: DecisorOut | None
    motivo_recusa: str | None


class Recusa(BaseModel):
    model_config = ConfigDict(extra="forbid")

    motivo: str | None = Field(None, max_length=300)
