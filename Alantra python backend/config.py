"""Runtime configuration.

Reads Supabase credentials from the environment. The frontend already ships
with ``SUPABASE_URL`` / ``SUPABASE_KEY``; we intentionally reuse the same
variable names so this backend can be deployed alongside the web tier without
any new secrets.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Settings:
    supabase_url: Optional[str]
    supabase_key: Optional[str]
    # Stable per-request knobs.
    default_best_apy: float = 0.048  # 4.8% — matches the UI copy
    runway_trailing_months: int = 3  # how many months we average burn over
    target_runway_months: int = 12
    outlier_runway_delta_pct: float = 0.10  # 10% – triggers treasury alert

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)


def load_settings() -> Settings:
    return Settings(
        supabase_url=os.environ.get("SUPABASE_URL"),
        supabase_key=os.environ.get("SUPABASE_KEY"),
    )
