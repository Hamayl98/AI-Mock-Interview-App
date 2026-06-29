# app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import time
import traceback

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/generate-questions/{role}")
def generate_questions(role: str):
    try:
        from rag_engine import rag_generate_and_store
        time.sleep(0.5)
        qa = rag_generate_and_store(role)
        return {
            "data": [
                {"question": q, "answer": a} for q, a in qa
            ]
        }
    except Exception as e:
        print("BACKEND ERROR")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evaluate")
def evaluate(data: dict):
    try:
        from feedback_engine import evaluate_answers
        result = evaluate_answers(data["answers"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── NEW: Dataset fallback endpoint ──────────────────────────────────────────
@app.get("/fallback-questions/{role}")
def get_fallback_questions(role: str):
    import csv
    import random
    import os

    dataset_path = os.path.join(os.path.dirname(__file__), "fallback_questions_dataset.csv")
    matched = []

    try:
        with open(dataset_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["role"].strip().lower() == role.strip().lower():
                    matched.append({
                        "question": row["question"],
                        "answer":   row["reference_answer"]
                    })
    except Exception as e:
        return {"data": [], "error": str(e)}

    if not matched:
        return {"data": [], "error": f"No fallback data found for role: {role}"}

    selected = random.sample(matched, min(5, len(matched)))
    return {"data": selected}