import pandas as pd

def compute_monthly_cashflow(df):
    """
    Computes monthly cashflow by aggregating transactions by month and category.
    
    Args:
        df (pd.DataFrame): DataFrame with columns 'date', 'amount', 'category', etc.
    
    Returns:
        pd.DataFrame: Aggregated data with columns 'month', 'category', 'total', 'count'
    """
    if df.empty:
        return pd.DataFrame(columns=["month", "category", "total", "count"])

    if "date" not in df.columns or "amount" not in df.columns:
        return pd.DataFrame(columns=["month", "category", "total", "count"])

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df.dropna(subset=["date", "amount"])
    if df.empty:
        return pd.DataFrame(columns=["month", "category", "total", "count"])

    if "category" not in df.columns:
        df["category"] = "unknown"

    df["month"] = df["date"].dt.to_period("M").astype(str)
    return df.groupby(["month", "category"]).agg(
        total=("amount", "sum"),
        count=("amount", "count")
    ).reset_index()