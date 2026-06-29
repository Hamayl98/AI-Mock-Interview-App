# feedback_engine.py
import re
from sentence_transformers import SentenceTransformer, util
from bert_score import score as bert_score
from nltk.corpus import words
import google.generativeai as genai
import os

# ── Gemini setup ──────────────────────────────────────────────────────────────
genai.configure(api_key=os.environ.get("AIzaSyAQOi0wxDVKOLORBdJsxMXY3cQl8GJFpy4", "AIzaSyA_dDgTCKQi8Ecm5IkcRzhg_Wo63mSQ4NU"))
gemini = genai.GenerativeModel("gemini-2.0-flash")

# ── Sentence-transformer for semantic similarity ──────────────────────────────
sim_model = SentenceTransformer("all-MiniLM-L6-v2")

# ── Stop words (excluded from keyword extraction) ─────────────────────────────
STOP_WORDS = {
    # Articles, conjunctions, prepositions
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "by","from","into","onto","upon","over","under","between","among","through",
    # Auxiliary / modal verbs
    "is","are","was","were","be","been","being","have","has","had",
    "do","does","did","will","would","could","should","may","might","must",
    # Pronouns
    "i","you","he","she","it","we","they","my","your","his","her","its",
    "our","their","this","that","these","those","who","whom","whose",
    # Question / relative words
    "what","which","how","when","where","why","whether",
    # Common adverbs / conjunctions
    "not","no","so","as","if","then","than","just","about","also","more",
    "very","all","some","any","each","every","both","few","many","much",
    "only","even","still","yet","now","here","there","well","while",
    "once","since","after","before","during","within","without","until",
    # Common short verbs that leak through
    "get","got","let","set","put","run","make","made","take","give","keep",
    "come","goes","went","come","said","say","used","uses","need","needs",
    "help","helps","mean","means","seem","seems","show","shows","work","works",
    "call","calls","find","finds","know","known","want","wants",
    # Vague / filler words that appear in ANY answer
    "good","great","best","better","able","easy","hard","real","true",
    "full","main","high","wide","long","fast","free","open","able",
    "fall","rest","rise","rest","time","part","most","last","next",
    "same","different","similar","other","another","point","thing",
    "case","type","kind","form","step","side","back","away","down",
    "sure","like","just","else","much","such","less","more","than",
    "that","then","them","they","than","thus","also","upon","even",
    # Weak nouns that carry no domain meaning
    "choice","option","approach","method","process","system","solution",
    "result","outcome","example","aspect","level","value","amount",
    "number","version","reason","place","area","role","goal","task",
    "item","list","fact","idea","term","word","line","name","mode",
    "user","users","team","teams","code","data","info","file","files",
    "shine","stand","start","build","built","bring","brought","show",
    "point","place","piece","focus","check","based","whole","given",
    # Pronouns / misc
    "me","him","us","them","mine","ours","your","their","itself",
    "myself","yourself","himself","herself","themselves","ourselves",
}


# ─────────────────────────────────────────────────────────────────────────────
# KEYWORD EXTRACTION & COMPARISON
# ─────────────────────────────────────────────────────────────────────────────

def extract_keywords(text: str) -> list[str]:
    """
    Extracts meaningful unique keywords from text.
    Filters stop words and tokens shorter than 4 characters.
    """
    tokens = re.sub(r"[^a-z0-9\s\-]", " ", text.lower()).split()
    return list(dict.fromkeys(
        t for t in tokens if len(t) > 3 and t not in STOP_WORDS
    ))


def compare_keywords(user_answer: str, reference_answer: str) -> dict:
    """
    Compares keywords between user answer and reference answer.

    Returns:
        matched  — keywords present in both
        missing  — keywords in reference but absent in user answer
        extra    — keywords in user answer not in reference (bonus context)
        coverage — percentage of reference keywords the user covered
    """
    ref_keywords  = extract_keywords(reference_answer)
    user_keywords = extract_keywords(user_answer)

    ref_set  = set(ref_keywords)
    user_set = set(user_keywords)

    matched  = [k for k in ref_keywords if k in user_set]
    missing  = [k for k in ref_keywords if k not in user_set]
    extra    = [k for k in user_keywords if k not in ref_set]
    coverage = int(len(matched) / len(ref_keywords) * 100) if ref_keywords else 0

    return {
        "matched":  matched[:10],   # cap for prompt brevity
        "missing":  missing[:10],
        "extra":    extra[:8],
        "coverage": coverage,
    }


# ─────────────────────────────────────────────────────────────────────────────
# METRICS
# ─────────────────────────────────────────────────────────────────────────────

def get_relevance(user: str, expected: str) -> int:
    """
    Blended relevance score:
      70% — RoBERTa BERTScore (F1)
      30% — Keyword coverage
    Returns 0–100.
    """

    if not user.strip() or not expected.strip():
        return 0

    try:
        P, R, F1 = bert_score(
            [user],
            [expected],
            lang="en",
            model_type="roberta-large",
            verbose=False
        )
        roberta_score = float(F1[0].item())

    except Exception as e:
        print("⚠️ BERTScore failed, fallback used:", e)
        roberta_score = 0.5   # safe neutral fallback

    kw = compare_keywords(user, expected)
    coverage = kw["coverage"] / 100

    blended = roberta_score * 0.70 + coverage * 0.30
    return max(0, min(100, int(blended * 100)))


# ─────────────────────────────────────────────────────────────────────────────
# GEMINI FEEDBACK  (keyword-aware)
# ─────────────────────────────────────────────────────────────────────────────

def generate_feedback(
    question:   str,
    user:       str,
    expected:   str,
    confidence: int,
    clarity:    int,
    relevance:  int,
    kw:         dict,
) -> str:
    """
    Generates a 3-sentence coaching paragraph using Gemini.
    The prompt explicitly includes matched and missing keywords so the
    feedback paragraph directly references what the candidate covered and missed.
    """
    matched_str = ", ".join(kw["matched"]) if kw["matched"] else "none"
    missing_str = ", ".join(kw["missing"]) if kw["missing"] else "none"

    prompt = f"""You are an expert interview coach evaluating a candidate's answer.

Interview Question:
"{question}"

Candidate's Answer:
"{user}"

Ideal Reference Answer:
"{expected}"

Keyword Analysis:
- Keywords the candidate covered: {matched_str}
- Important keywords the candidate missed: {missing_str}
- Keyword coverage: {kw['coverage']}%

Scores: Confidence {confidence}/100 | Clarity {clarity}/100 | Relevance {relevance}/100

Write a coaching feedback paragraph (exactly 3 sentences, plain text, no bullet points, no headers, no labels):
Sentence 1: Acknowledge what the candidate did well, mentioning specific keywords they covered.
Sentence 2: Point out what was missing, explicitly naming the missing keywords.
Sentence 3: Give one concrete, actionable improvement tip for their next attempt."""

    try:
        res = gemini.generate_content(prompt)
        return res.text.strip() if res and res.text else _fallback_feedback(kw, matched_str, missing_str)
    except Exception as e:
        return _fallback_feedback(kw, matched_str, missing_str)


# ─────────────────────────────────────────────────────────────────────────────
# CONFIDENCE SCORE
# ─────────────────────────────────────────────────────────────────────────────

# load english dictionary
ENGLISH_WORDS = set(words.words())

def is_gibberish(text: str) -> bool:
    """
    Detect random typed answers like:
    'asdfgh'
    'fcefc'
    'eger'
    'aaaa'
    etc.
    """

    if not text or not text.strip():
        return True

    cleaned = re.sub(r'[^a-zA-Z\s]', '', text.lower()).strip()

    if not cleaned:
        return True

    tokens = cleaned.split()

    if len(tokens) == 0:
        return True

    # Single random word like "fcefc"
    if len(tokens) == 1:
        word = tokens[0]

        # if word not real english word
        if word not in ENGLISH_WORDS:
            return True

        # repeated characters
        if len(set(word)) <= 2:
            return True

        # too short random answer
        if len(word) < 4:
            return True

    valid_words = sum(1 for word in tokens if word in ENGLISH_WORDS)
    valid_ratio = valid_words / len(tokens)

    # less than 50% valid words = gibberish
    if valid_ratio < 0.5:
        return True

    # total answer too short
    total_words = len(tokens)
    if total_words <= 2:
        return True

    return False


def get_confidence(user_answer: str) -> int:
    if not user_answer.strip():
        return 0

    # immediately return 0 for garbage answer
    if is_gibberish(user_answer):
        return 0

    text = user_answer.lower()
    words_list = text.split()
    total_words = len(words_list)

    filler_words = [
        "um", "uh", "like",
        "basically", "actually",
        "hmm", "you know"
    ]

    filler_count = sum(text.count(word) for word in filler_words)
    filler_penalty = filler_count * 5

    repeated_words = len([
        words_list[i]
        for i in range(len(words_list)-1)
        if words_list[i] == words_list[i+1]
    ])

    repetition_penalty = repeated_words * 5

    if total_words < 5:
        length_score = 20
    elif total_words < 20:
        length_score = 50
    elif total_words < 50:
        length_score = 80
    else:
        length_score = 90

    final_score = length_score - filler_penalty - repetition_penalty

    return max(0, min(100, final_score))

# ─────────────────────────────────────────────────────────────────────────────
# CLARITY SCORE
# ─────────────────────────────────────────────────────────────────────────────

def get_clarity(user_answer: str) -> int:
    if not user_answer.strip():
        return 0

    # immediately return 0 for garbage answer
    if is_gibberish(user_answer):
        return 0

    total_words = len(user_answer.split())

    # very short answer = poor clarity
    if total_words <= 3:
        return 0

    sentences = re.split(r'[.!?]', user_answer)
    valid_sentences = [s for s in sentences if s.strip()]

    avg_sentence_length = (
        total_words / len(valid_sentences)
        if valid_sentences else total_words
    )

    clarity_score = 80

    if total_words < 10:
        clarity_score -= 30

    if avg_sentence_length > 30:
        clarity_score -= 20

    if "." in user_answer:
        clarity_score += 5

    return max(0, min(100, clarity_score))


def _fallback_feedback(kw: dict, matched_str: str, missing_str: str) -> str:
    """Rule-based fallback if Gemini call fails."""
    part1 = (
        f"You demonstrated understanding of key concepts such as {matched_str}."
        if kw["matched"] else
        "Your answer lacked role-specific terminology from the reference answer."
    )
    part2 = (
        f"However, important concepts were missing from your response: {missing_str}."
        if kw["missing"] else
        "You covered the main concepts from the reference answer well."
    )
    part3 = (
        "Try structuring your next answer using the STAR method and "
        "consciously incorporating the missing keywords to improve your coverage score."
    )
    return f"{part1} {part2} {part3}"


def generate_overall_summary(
    avg_confidence: int,
    avg_clarity:    int,
    avg_relevance:  int,
) -> str:
    prompt = f"""You are an interview coach giving a candidate their overall session summary.

Average scores — Confidence: {avg_confidence}/100, Clarity: {avg_clarity}/100, Relevance: {avg_relevance}/100.

In exactly 2 sentences: summarise their overall performance honestly but encouragingly,
then give ONE specific action item they should focus on before their next practice session.
Plain text only, no bullet points, no headers."""
    try:
        res = gemini.generate_content(prompt)
        return res.text.strip() if res and res.text else ""
    except Exception:
        return (
            f"Your session showed {'strong' if avg_relevance > 70 else 'developing'} "
            f"answer relevance with {'confident' if avg_confidence > 70 else 'room to improve'} delivery. "
            "Focus on using the STAR method and incorporating role-specific keywords in your next session."
        )


# ─────────────────────────────────────────────────────────────────────────────
# MAIN EVALUATION ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_answers(
    answer_list: list[dict],
    eye_contact_score: int = 0,
    gesture_score: int = 0
) -> dict:
    """
    answer_list:
    [
        {
            "question": str,
            "userAnswer": str,
            "expectedAnswer": str
        }
    ]

    Final Score Formula:
    40% Relevance
    20% Confidence
    20% Clarity
    10% Eye Contact
    10% Gestures
    """

    if not answer_list:
        return {
            "score": 0,
            "relevance": 0,
            "confidence": 0,
            "clarity": 0,
            "eyeContact": eye_contact_score,
            "gestures": gesture_score,
            "overall": "",
            "details": []
        }

    results = []

    total_conf = 0
    total_clarity = 0
    total_rel = 0

    for item in answer_list:
        q = item.get("question", "")
        user = item.get("userAnswer", "")
        expected = item.get("expectedAnswer", "")

        # Keyword comparison
        kw = compare_keywords(user, expected)

        # Individual metrics
        conf = get_confidence(user)
        clarity = get_clarity(user)
        rel = get_relevance(user, expected)

        # Gemini feedback
        feedback = generate_feedback(
            q,
            user,
            expected,
            conf,
            clarity,
            rel,
            kw
        )

        total_conf += conf
        total_clarity += clarity
        total_rel += rel

        results.append({
            "question": q,
            "confidence": conf,
            "clarity": clarity,
            "relevance": rel,
            "feedback": feedback,
            "keywordAnalysis": {
                "matched": kw["matched"],
                "missing": kw["missing"],
                "extra": kw["extra"],
                "coveragePercent": kw["coverage"]
            }
        })

    n = len(answer_list)

    avg_conf = int(total_conf / n)
    avg_clarity = int(total_clarity / n)
    avg_rel = int(total_rel / n)

    # Final weighted score
    final_score = int(
        (0.4 * avg_rel) +
        (0.2 * avg_conf) +
        (0.2 * avg_clarity) +
        (0.1 * eye_contact_score) +
        (0.1 * gesture_score)
    )

    overall = generate_overall_summary(
        avg_conf,
        avg_clarity,
        avg_rel
    )

    return {
        "score": final_score,
        "relevance": avg_rel,
        "confidence": avg_conf,
        "clarity": avg_clarity,
        "eyeContact": eye_contact_score,
        "gestures": gesture_score,
        "overall": overall,
        "details": results
    }