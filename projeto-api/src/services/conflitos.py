"""Regras puras da detecção de conflito de horário (data-model E3 "Conflito"; plan D-E3-9)."""

import unicodedata
from datetime import time


def normalizar_local(local: str | None) -> str | None:
    """Sem acento, sem diferença de caixa e com espaços colapsados; vazio vira None."""
    if local is None:
        return None
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFKD", local) if not unicodedata.combining(c)
    )
    return " ".join(sem_acento.casefold().split()) or None


def mesma_sala(a: str | None, b: str | None) -> bool:
    """Horário sem local nunca conflita por sala."""
    na, nb = normalizar_local(a), normalizar_local(b)
    return na is not None and na == nb


def sobrepoe(inicio_a: time, fim_a: time, inicio_b: time, fim_b: time) -> bool:
    """Sobreposição estrita: encostar (um termina quando o outro começa) não é conflito."""
    return inicio_a < fim_b and inicio_b < fim_a
