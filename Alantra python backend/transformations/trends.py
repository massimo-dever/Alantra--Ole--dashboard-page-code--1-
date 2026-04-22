import pandas as pd

def compute_trends(df):
    """
    Computes monthly trends in total amount and transaction count.
    
    Args:
        df (pd.DataFrame): DataFrame with 'date', 'amount'
    
    Returns:
        pd.DataFrame: Monthly aggregated trends
    """
    if df.empty:
        return pd.DataFrame(columns=["month", "total_amount", "transaction_count"])

    if "date" not in df.columns or "amount" not in df.columns:
        return pd.DataFrame(columns=["month", "total_amount", "transaction_count"])

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df.dropna(subset=["date", "amount"])
    if df.empty:
        return pd.DataFrame(columns=["month", "total_amount", "transaction_count"])

    df["month"] = df["date"].dt.to_period("M").astype(str)
    return df.groupby("month").agg(
        total_amount=("amount", "sum"),
        transaction_count=("amount", "count")
    ).reset_index()