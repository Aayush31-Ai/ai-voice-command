
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from .env.local
load_dotenv('backend/.env.local')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Supabase credentials not found in backend/.env.local")
    exit(1)

supabase = create_client(url, key)

try:
    # Try querying public.users
    response = supabase.table("users").select("*").limit(5).execute()
    print("Users from public.users:")
    for user in response.data:
        print(user)
except Exception as e:
    print(f"Error querying public.users: {e}")
    
    # Try querying auth.users (Note: service role key is required for this)
    try:
        # Supabase Python client doesn't expose auth.users directly via .table() usually
        # But we can try the auth API or a direct SQL if allowed.
        # Actually, let's just list tables to see what's available if public.users fails.
        pass
    except Exception as e2:
        print(f"Error querying auth.users: {e2}")
