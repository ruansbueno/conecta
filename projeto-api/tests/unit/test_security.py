import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from src.core.config import get_settings
from src.core.security import TokenInvalido, create_access_token, decode_access_token


def test_token_carrega_sub_perfil_e_expira_em_24h():
    usuario_id = uuid.uuid4()
    antes = datetime.now(UTC)

    token = create_access_token(usuario_id, "aluno")
    claims = jwt.decode(token, options={"verify_signature": False})

    assert claims["sub"] == str(usuario_id)
    assert claims["perfil"] == "aluno"
    exp = datetime.fromtimestamp(claims["exp"], UTC)
    folga = timedelta(seconds=5)
    assert timedelta(hours=24) - folga <= exp - antes <= timedelta(hours=24) + folga


def test_decode_devolve_o_id_do_usuario():
    usuario_id = uuid.uuid4()

    assert decode_access_token(create_access_token(usuario_id, "docente")) == usuario_id


def test_token_expirado_e_rejeitado():
    claims = {
        "sub": str(uuid.uuid4()),
        "perfil": "aluno",
        "exp": datetime.now(UTC) - timedelta(seconds=1),
    }
    token = jwt.encode(claims, get_settings().JWT_SECRET, algorithm="HS256")

    with pytest.raises(TokenInvalido):
        decode_access_token(token)


def test_token_com_outra_assinatura_e_rejeitado():
    claims = {
        "sub": str(uuid.uuid4()),
        "perfil": "administrador",
        "exp": datetime.now(UTC) + timedelta(hours=1),
    }
    token = jwt.encode(claims, "outro-segredo-qualquer-com-tamanho-suficiente", algorithm="HS256")

    with pytest.raises(TokenInvalido):
        decode_access_token(token)


@pytest.mark.parametrize("token", ["", "nao-e-jwt", "a.b.c"])
def test_token_malformado_e_rejeitado(token):
    with pytest.raises(TokenInvalido):
        decode_access_token(token)
