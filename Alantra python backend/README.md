# Financial Analytics Backend

This is a Python FastAPI backend for processing financial data from Plaid via Supabase.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables in `.env`:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase service role key

3. Run the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

4. Access the API documentation at `http://localhost:8000/docs`

## Endpoints

- `GET /health`: Health check
- `GET /analytics/cashflow?user_id=<id>`: Monthly cashflow by category
- `GET /analytics/spending?user_id=<id>`: Monthly spending by category
- `GET /analytics/trends?user_id=<id>`: Monthly trends

## Project Structure

- `main.py`: FastAPI application and routes
- `db.py`: Supabase client setup
- `transformations/`: Data transformation functions
- `models.py`: Pydantic models for requests/responses
- `.env`: Environment variables (not committed)
- `requirements.txt`: Python dependencies