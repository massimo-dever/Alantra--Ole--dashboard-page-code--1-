import pandas as pd

def compute_spending_by_category(df):
    """
    Computes spending by category per month, assuming expenses have negative amounts.
    
    Args:
        df (pd.DataFrame): DataFrame with 'date', 'amount', 'category'
    
    Returns:
        pd.DataFrame: Aggregated spending data
    """
    if df.empty:
        return pd.DataFrame(columns=["month", "category", "total_spent", "count"])

    if "date" not in df.columns or "amount" not in df.columns:
        return pd.DataFrame(columns=["month", "category", "total_spent", "count"])

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df.dropna(subset=["date", "amount"])
    if df.empty:
        return pd.DataFrame(columns=["month", "category", "total_spent", "count"])

    if "category" not in df.columns:
        df["category"] = "unknown"

    df["month"] = df["date"].dt.to_period("M").astype(str)
    df_expenses = df[df["amount"] < 0]
    if df_expenses.empty:
        return pd.DataFrame(columns=["month", "category", "total_spent", "count"])

    return df_expenses.groupby(["month", "category"]).agg(
        total_spent=("amount", lambda x: -x.sum()),
        count=("amount", "count")
    ).reset_index()