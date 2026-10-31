import uuid

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator, model_validator

from src.schemas.horario import ConflitoOut, Hora, HorarioOut


class HorarioCreate(BaseModel):
    # Espaços nas pontas saem; um local só de espaços fica vazio e é recusado (min_length).
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    dia_semana: int = Field(ge=1, le=7)
    inicio: Hora
    fim: Hora
    disciplina: str = Field(min_length=2, max_length=120)
    local: str | None = Field(None, min_length=1, max_length=80)
    docente_id: uuid.UUID | None = None

    @field_validator("fim")
    @classmethod
    def _fim_depois_do_inicio(cls, fim, info: ValidationInfo):
        inicio = info.data.get("inicio")
        if inicio is not None and fim <= inicio:
            raise ValueError("deve ser maior que inicio")
        return fim


class HorarioPatch(BaseModel):
    """Parcial; `local` e `docente_id` aceitam null. O `fim` é conferido no serviço."""

    # Espaços nas pontas saem; um local só de espaços fica vazio e é recusado (min_length).
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    dia_semana: int | None = Field(None, ge=1, le=7)
    inicio: Hora | None = None
    fim: Hora | None = None
    disciplina: str | None = Field(None, min_length=2, max_length=120)
    local: str | None = Field(None, min_length=1, max_length=80)
    docente_id: uuid.UUID | None = None

    @model_validator(mode="before")
    @classmethod
    def _ao_menos_um_campo(cls, dados):
        if isinstance(dados, dict):
            if not dados:
                raise ValueError("informe ao menos um campo")
            obrigatorios = ("dia_semana", "inicio", "fim", "disciplina")
            nulos = [c for c in obrigatorios if c in dados and dados[c] is None]
            if nulos:
                raise ValueError(f"{nulos[0]} não pode ser nulo")
        return dados


class HorarioEnvelope(BaseModel):
    """Resposta de criar e editar: o horário gravado e os conflitos encontrados (RF-44)."""

    horario: HorarioOut
    conflitos: list[ConflitoOut]
