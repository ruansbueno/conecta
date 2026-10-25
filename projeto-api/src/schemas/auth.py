from typing import Literal

from pydantic import BaseModel, Field

from src.schemas.usuario import UsuarioOut


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class LoginResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    usuario: UsuarioOut
