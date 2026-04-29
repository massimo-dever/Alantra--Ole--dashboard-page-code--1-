"""Very thin wrapper around ``supabase-py``.

We intentionally keep this tiny: every consumer hits a single helper that
returns a native Python list of dicts, which is already what ``postgrest`` /
``supabase-py`` gives us. The wrapper exists so the transformations can be
tested in isolation against in-memory fixtures (see ``FakeClient``).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Protocol

try:
    from supabase import Client, create_client  # type: ignore
except Exception:  # pragma: no cover - optional at import time
    Client = None  # type: ignore
    create_client = None  # type: ignore


class SupabaseReader(Protocol):
    def select(
        self,
        table: str,
        *,
        columns: str = "*",
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        ...


class LiveSupabaseReader:
    """Real Supabase reader. One method, ``select``, returning dicts."""

    def __init__(self, url: str, key: str):
        if create_client is None:
            raise RuntimeError("supabase-py is not installed")
        self._client: Client = create_client(url, key)

    def select(
        self,
        table: str,
        *,
        columns: str = "*",
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        q = self._client.table(table).select(columns)
        for k, v in (filters or {}).items():
            q = q.eq(k, v)
        if order_by:
            q = q.order(order_by)
        if limit:
            q = q.limit(limit)
        return q.execute().data or []


class FakeSupabaseReader:
    """In-memory stand-in for tests.

    ``tables`` maps a table name to a list of row dicts. ``filters`` performs
    plain equality matches and ``order_by`` / ``limit`` behave the same way the
    live version does.
    """

    def __init__(self, tables: Dict[str, List[Dict[str, Any]]]):
        self._tables = tables

    def select(
        self,
        table: str,
        *,
        columns: str = "*",
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        rows = list(self._tables.get(table, []))
        for k, v in (filters or {}).items():
            rows = [r for r in rows if r.get(k) == v]
        if order_by:
            rows = sorted(rows, key=lambda r: r.get(order_by))
        if limit:
            rows = rows[:limit]
        return rows
