try:
    from supabase import create_client
except ImportError:
    create_client = None

import os
from dotenv import load_dotenv

load_dotenv()

supabase = None
if create_client is not None:
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))