from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from db import supabase
from transformations.cashflow import compute_monthly_cashflow
from transformations.spending import compute_spending_by_category
from transformations.trends import compute_trends

app = FastAPI()

def fetch_transactions(user_id: str) -> pd.DataFrame:
    """
    Fetches transaction rows from Supabase and returns a cleaned DataFrame.
    """
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase client is unavailable")

    response = supabase.table("plaid_transactions").select("*").eq("user_id", user_id).execute()

    if getattr(response, "error", None):
        raise HTTPException(status_code=502, detail=f"Supabase query failed: {response.error}")

    if response.data is None:
        raise HTTPException(status_code=502, detail="Supabase returned an invalid response")

    df = pd.DataFrame(response.data)
    if df.empty:
        return pd.DataFrame(columns=["date", "amount", "category"])

    return df

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    """
    Health check endpoint to verify the service is running.
    """
    return {"status": "ok"}

@app.get("/analytics/cashflow")
async def get_cashflow(user_id: str):
    """
    Endpoint to get monthly cashflow data aggregated by category.
    
    Args:
        user_id (str): The user ID to filter transactions.
    
    Returns:
        List[dict]: List of cashflow items with month, category, total, count.
    """
    df = fetch_transactions(user_id)
    result = compute_monthly_cashflow(df)
    return result.to_dict(orient="records")

@app.get("/analytics/spending")
async def get_spending(user_id: str):
    """
    Endpoint to get spending data by category per month.
    
    Args:
        user_id (str): The user ID to filter transactions.
    
    Returns:
        List[dict]: List of spending items with month, category, total_spent, count.
    """
    df = fetch_transactions(user_id)
    result = compute_spending_by_category(df)
    return result.to_dict(orient="records")

@app.get("/analytics/trends")
async def get_trends(user_id: str):
    """
    Endpoint to get monthly trends in total amount and transaction count.
    
    Args:
        user_id (str): The user ID to filter transactions.
    
    Returns:
        List[dict]: List of trend items with month, total_amount, transaction_count.
    """
    df = fetch_transactions(user_id)
    result = compute_trends(df)
    return result.to_dict(orient="records")