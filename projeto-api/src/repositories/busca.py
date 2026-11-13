"""Busca `q` das listas de gestão: "contém o texto", sem diferenciar maiúsculas de minúsculas.

`%` e `_` são curingas do `LIKE`; aqui valem como texto (emenda v2.4, specs/003 D-RV-5): quem
procura "100%" não recebe "1000".
"""

from sqlalchemy import ColumnElement, or_

_ESCAPE = "\\"


def contem(q: str, *colunas) -> ColumnElement[bool]:
    termo = q.strip()
    for especial in (_ESCAPE, "%", "_"):
        termo = termo.replace(especial, _ESCAPE + especial)
    return or_(*(coluna.ilike(f"%{termo}%", escape=_ESCAPE) for coluna in colunas))
