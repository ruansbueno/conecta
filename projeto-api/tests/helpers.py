from http.cookies import SimpleCookie

from src.models.usuario import Usuario


async def criar_usuario(db, **campos) -> Usuario:
    usuario = Usuario(
        username=campos.pop("username", "fulano.teste"),
        nome=campos.pop("nome", "Fulano"),
        **campos,
    )
    db.add(usuario)
    await db.commit()
    return usuario


def set_cookies(response) -> dict:
    """Cookies do cabeçalho Set-Cookie, com atributos (morsels) por nome."""
    cookies = {}
    for header in response.headers.get_list("set-cookie"):
        jar = SimpleCookie()
        jar.load(header)
        cookies.update(jar)
    return cookies


async def login(client, username="aluno.teste", password="senha-teste"):
    return await client.post("/auth/login", json={"username": username, "password": password})
