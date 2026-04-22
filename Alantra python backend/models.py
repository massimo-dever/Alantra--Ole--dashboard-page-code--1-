from pydantic import BaseModel
from typing import List

class CashflowItem(BaseModel):
    month: str
    category: str
    total: float
    count: int

class SpendingItem(BaseModel):
    month: str
    category: str
    total_spent: float
    count: int

class TrendItem(BaseModel):
    month: str
    total_amount: float
    transaction_count: int

# Request models if needed
class UserRequest(BaseModel):
    user_id: str