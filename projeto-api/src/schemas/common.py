from dataclasses import dataclass

from fastapi import Query
from pydantic import BaseModel


class Page[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int


@dataclass
class PaginationParams:
    limit: int = Query(20, ge=1, le=100)
    offset: int = Query(0, ge=0)
