# Alantra Python Backend

Dedicated Python service that owns every financial-data transformation currently
scattered across the Next.js frontend. The goal is to make the web frontend a
thin presentation layer: it fetches pre-computed payloads for each dashboard
page from this service.

## High-level shape

```
alantra_backend/
├── config.py              # env wiring (Supabase URL / key)
├── supabase_client.py     # typed wrapper around the Supabase REST client
├── importer.py            # pulls raw data from the same Supabase tables the
│                          # Next.js importer writes into (Plaid + Stripe)
├── models.py              # pydantic domain models mirroring prisma/schema.prisma
├── normalize.py           # "raw row -> domain object" helpers (sign / date /
│                          # category normalization – the key transformation
│                          # everyone else depends on)
├── fixtures/              # Plaid-sandbox-shaped fixture data, used by tests
│                          # and as a fallback when running without secrets
└── transformations/
    ├── context.py             # Per-request DashboardContext that caches
    │                          # shared transformations (transactions,
    │                          # recurring payments, command-center stats)
    │                          # so each one runs ONCE per request.
    ├── command_center.py      # Runway per account, runway-time-series, KPIs
    ├── treasury.py            # Treasury stats + outlier / APY / target alerts
    ├── cash_calendar.py       # Forward cash calendar & tightest-point finder
    ├── cash_intelligence.py   # Cash / Growth / Efficiency / Spend tables
    ├── forecast.py            # Base/Upside/Downside scenarios + P&L table
    └── recurring_outflow.py   # Recurring payment detection & review flagging
```

`app.py` (at the package root) exposes everything via FastAPI. Each spec'd
webpage gets its own endpoint and they all share a single
:class:`DashboardContext` per request so transformations needed by multiple
sections are computed exactly once.

Endpoints (one per spec'd webpage):

* `GET /command-center` – Command Center
* `GET /treasury` – Metrics & Monitoring → Treasury
* `GET /cash-calendar` – Metrics & Monitoring → Cash Calendar
* `GET /cash-intelligence` – Metrics & Monitoring → Cash Intelligence
* `GET /forecast` – Budgets & Forecasts → Forecast & Scenarios
* `GET /recurring-outflow` – Budgets & Forecasts → Recurring Outflow

## Plaid sandbox compatibility

The transformations are designed against the exact row shape the existing
frontend importer writes into Supabase (see
`lib/services/plaid-service.ts` / `mappers.ts` and
`prisma/schema.prisma` in the repo root). That keeps us drop-in compatible
with the Plaid sandbox data already stored in Supabase.

The fixture under `alantra_backend/fixtures/plaid_sandbox.py` is a faithful
deterministic replay of Plaid's Sandbox dataset (the same one `plaid_client.
transactionsSync()` returns in sandbox mode), so the unit tests exercise the
same branches as the real data path.

## Running

```bash
pip install -r requirements.txt
# one-shot dev-server; set SUPABASE_URL / SUPABASE_KEY to point at your project
uvicorn alantra_backend.app:app --reload
```

## Tests

```bash
pip install -r requirements.txt
pytest -q
```

Every transformation is covered with a test that runs against the Plaid
sandbox fixture. No external services are required to run the suite.
