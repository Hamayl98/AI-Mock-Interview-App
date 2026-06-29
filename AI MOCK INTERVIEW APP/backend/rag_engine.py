# rag_engine.py
import os
import chromadb
import random
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

# ================== CONFIG ==================
genai.configure(api_key="AIzaSyCf0sAvoxOIahy1KVQA5dDs2hiVa1xnTsA")  # 🔴 Replace with your key
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# ===============
# === MODEL ==================
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

model = genai.GenerativeModel(
    "gemini-2.5-flash",
    generation_config={
        "temperature": 0.9,
        "max_output_tokens": 1500
    }
)

# ================== DATABASE ==================
client = chromadb.PersistentClient(path="./rag_db")
collection = client.get_or_create_collection(
    name="job_role_interview_db",
    metadata={"hnsw:space": "cosine"}
)

# ================== JOB ROLES ==================
job_role_keywords = {
    "QA Engineer": ["test cases", "automation testing", "selenium", "bug reporting"],
    "Web Development": ["html", "css", "javascript", "backend", "databases"],
    "Project Management": ["agile", "scrum", "risk management"],
    "Frontend Developer": ["react", "ui design", "javascript"],
    "Game Developer": ["unity", "game physics", "c#", "graphics"],
    "Backend Developer": ["apis", "databases", "authentication", "nodejs"],
    "Data Scientist": ["machine learning", "data cleaning", "statistics"],
    "Cloud Computing": ["aws", "azure", "cloud services"],
    "Cybersecurity": ["firewalls", "threat analysis", "encryption"],
    "Ai": ["deep learning", "neural networks", "llms"]
}

# ================== ROLE NORMALIZER ==================
def normalize_role(input_role):
    clean_input = input_role.strip().lower().replace(" ", "")
    for key in job_role_keywords.keys():
        clean_key = key.lower().replace(" ", "")
        if clean_input == clean_key or clean_input in clean_key:
            return key
    raise ValueError(f"Role '{input_role}' not found.")

# ================== STORE KEYWORDS ==================
def store_base_keywords():
    if collection.count() > 0:
        return

    idx = 0
    for role, keywords in job_role_keywords.items():
        for kw in keywords:
            collection.add(
                ids=[f"kw_{idx}"],
                documents=[kw],
                embeddings=[embed_model.encode(kw).tolist()],
                metadatas=[{"role": role, "type": "keyword"}]
            )
            idx += 1

store_base_keywords()

# ================== GET QUESTIONS ==================
def get_existing_questions(role):
    data = collection.get(include=["documents", "metadatas"])
    return [
        doc for doc, meta in zip(data["documents"], data["metadatas"])
        if meta.get("role") == role and meta.get("type") == "question"
    ]

# ================== FALLBACK ==================
# ================== FALLBACK ==================
# ================== FALLBACK ==================
def fallback_questions(role="this role"):
    import csv

    print("⚠️ FALLBACK CALLED WITH ROLE:", role)

    dataset_path = os.path.join(os.path.dirname(__file__), "fallback_questions_dataset.csv")
    matched = []

    try:
        with open(dataset_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["role"].strip().lower() == role.strip().lower():
                    matched.append((row["question"], row["reference_answer"]))
    except Exception as e:
        print(f"❌ CSV load error: {e}")
        return []

    if not matched:
        print(f"❌ No dataset questions found for role: {role}")
        return []

    result = random.sample(matched, min(5, len(matched)))
    print(f"✅ Loaded {len(result)} fallback Q&As from CSV for role: {role}")
    return result
# ================== GENERATE ==================
def generate_questions_with_answers(role):

    role = normalize_role(role)
    keywords = job_role_keywords.get(role, [])
    old_questions = get_existing_questions(role)

    avoid_block = ""
    if old_questions:
        avoid_block = "Do NOT repeat:\n" + "\n".join(old_questions[-50:])

    prompt = f"""
You are an expert interviewer.

Role: {role}
Keywords: {", ".join(keywords)}

{avoid_block}

IMPORTANT:
Return EXACTLY in this format. No extra text.

Q: Question 1
A: Answer 1

Q: Question 2
A: Answer 2

Q: Question 3
A: Answer 3

Q: Question 4
A: Answer 4

Q: Question 5
A: Answer 5
"""

    try:
        response = model.generate_content(prompt)
        if response is None:
            return fallback_questions(role)

        print("\n===== GEMINI DEBUG =====")
        print("ROLE:", role)
        print("RESPONSE TEXT:", response.text)
        print("========================\n")

    except Exception as e:
        print("❌ GEMINI ERROR:", e)
        return fallback_questions(role)

    # ❌ Empty response
    if not response or not hasattr(response, "text") or not response.text:
        print("❌ EMPTY RESPONSE")
        return fallback_questions(role)

    # ================== PARSER ==================
    qa_pairs = []
    current_q = None

    for line in response.text.split("\n"):
        line = line.strip()

        if line.lower().startswith("q:"):
            current_q = line[2:].strip()

        elif line.lower().startswith("a:") and current_q:
            qa_pairs.append((current_q, line[2:].strip()))
            current_q = None

    # ❌ Parsing failed
    if not qa_pairs:
        print("❌ PARSING FAILED")
        return fallback_questions(role)

    return qa_pairs

# ================== STORE ==================
def store_qa(role, qa_pairs):

    role = normalize_role(role)
    base_id = collection.count()

    for i, (q, a) in enumerate(qa_pairs):
        qa_id = f"qa_{base_id+i}"

        collection.add(
            ids=[f"{qa_id}_q"],
            documents=[q],
            embeddings=[embed_model.encode(q).tolist()],
            metadatas=[{"role": role, "type": "question"}]
        )

        collection.add(
            ids=[f"{qa_id}_a"],
            documents=[a],
            embeddings=[embed_model.encode(a).tolist()],
            metadatas=[{"role": role, "type": "answer"}]
        )

# ================== MAIN PIPELINE ==================
def rag_generate_and_store(role):

    role = normalize_role(role)
    print("\n=== GENERATING FOR:", role, "===")

    # STEP 1: Generate
    new_qa = generate_questions_with_answers(role)

    if not new_qa:
        return fallback_questions(role)

    # STEP 2: Store
    store_qa(role, new_qa)

    # STEP 3: Get all
    data = collection.get(include=["documents", "metadatas"])

    questions, answers = [], []

    for doc, meta in zip(data["documents"], data["metadatas"]):
        if meta.get("role") == role and meta.get("type") == "question":
            questions.append(doc)
        elif meta.get("role") == role and meta.get("type") == "answer":
            answers.append(doc)

    paired = list(zip(questions, answers))

    # STEP 4: Safe return
    if len(paired) == 0:
        print("⚠️ DB EMPTY")
        return fallback_questions(role)

    try:
        result = random.sample(paired, min(5, len(paired)))
    except:
        result = paired[:5]

    print("✅ FINAL OUTPUT:", result)
    return result

def debug_db():
    data = collection.get(include=["documents", "metadatas"])
    
    for doc, meta in zip(data["documents"], data["metadatas"]):
        print(doc, meta)

if __name__ == "__main__":
    debug_db()