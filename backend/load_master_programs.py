import os

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client
from sentence_transformers import SentenceTransformer

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL / SUPABASE_KEY. "
        "Please configure them in backend/.env before running load_master_programs.py."
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize SentenceTransformer model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Load program seeds
def load_program_seeds(file_path: str):
    return pd.read_csv(file_path)

# Precompute embeddings
def compute_embeddings(data: pd.DataFrame):
    data["skill_embedding"] = data["skills"].apply(lambda x: model.encode(x).tolist())
    data["program_embedding"] = data["description"].apply(lambda x: model.encode(x).tolist())
    return data

# Insert data into Supabase
def insert_into_supabase(data: pd.DataFrame):
    for _, row in data.iterrows():
        supabase.table("master_programs").insert({
            "university": row["university"],
            "program": row["program"],
            "degree": row["degree"],
            "school": row["school"],
            "official_url": row["official_url"],
            "field": row["field"],
            "skill_embedding": row["skill_embedding"],
            "program_embedding": row["program_embedding"],
        }).execute()

if __name__ == "__main__":
    # Load data
    program_seeds = load_program_seeds("programlist_crawled.csv")

    # Compute embeddings
    program_seeds = compute_embeddings(program_seeds)

    # Insert into Supabase
    insert_into_supabase(program_seeds)