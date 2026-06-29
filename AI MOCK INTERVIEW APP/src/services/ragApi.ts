// ragApi.ts

// ── Types 

export interface RagQuestion {
  question: string;
  referenceAnswer: string; // Gemini-generated ideal answer from backend
}

export interface AnswerItem {
  question: string;
  userAnswer: string;
  expectedAnswer: string; // always populated from backend
}

export interface KeywordAnalysis {
  matched: string[];   // keywords present in both user answer and reference
  missing: string[];   // keywords in reference but absent from user answer
  extra: string[];     // keywords in user answer not in reference (bonus)
  coveragePercent: number; // matched / total reference keywords * 100
}

export interface EvaluationResult {
  confidence: number;
  clarity: number;
  relevance: number;
  overallFeedback: string;
  details: {
    question: string;
    confidence: number;
    clarity: number;
    relevance: number;
    feedback: string;           // Gemini qualitative coaching paragraph
    keywordAnalysis: KeywordAnalysis; // keyword comparison data
  }[];
}

// ── IndexedDB Cache ───────────────────────────────────────────────────────────
// Caches Q/A pairs locally so we don't re-fetch on every render.

const DB_NAME    = "interview_vector_store_v2";
const DB_VERSION = 1;
const STORE_NAME = "qa_pairs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "question" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

async function cacheQAPair(pair: RagQuestion): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(pair);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch {
    // Cache failure is non-fatal
  }
}

async function getCachedQAPair(question: string): Promise<RagQuestion | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(question);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// ── Keyword Extraction & Comparison ──────────────────────────────────────────

// Common stop words to exclude from keyword analysis
const STOP_WORDS = new Set([
  // Articles, conjunctions, prepositions
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","into","onto","upon","over","under","between","among","through",
  // Auxiliary / modal verbs
  "is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","must",
  // Pronouns
  "i","you","he","she","it","we","they","my","your","his","her","its",
  "our","their","this","that","these","those","who","whom","whose",
  // Question / relative words
  "what","which","how","when","where","why","whether",
  // Common adverbs / conjunctions
  "not","no","so","as","if","then","than","just","about","also","more",
  "very","all","some","any","each","every","both","few","many","much",
  "only","even","still","yet","now","here","there","well","while",
  "once","since","after","before","during","within","without","until",
  // Common short verbs
  "get","got","let","set","put","run","make","made","take","give","keep",
  "come","goes","went","said","say","used","uses","need","needs",
  "help","helps","mean","means","seem","seems","show","shows","work","works",
  "call","calls","find","finds","know","known","want","wants",
  // Vague / filler words
  "good","great","best","better","able","easy","hard","real","true",
  "full","main","high","wide","long","fast","free","open",
  "fall","rest","rise","time","part","most","last","next",
  "same","different","similar","other","another","point","thing",
  "case","type","kind","form","step","side","back","away","down",
  "sure","like","else","such","less","thus",
  // Weak nouns with no domain meaning
  "choice","option","approach","method","process","system","solution",
  "result","outcome","example","aspect","level","value","amount",
  "number","version","reason","place","area","role","goal","task",
  "item","list","fact","idea","term","word","line","name","mode",
  "user","users","team","teams","code","data","info","file","files",
  "shine","stand","start","build","built","bring","brought",
  "point","place","piece","focus","check","based","whole","given",
  // Pronouns / misc
  "me","him","us","them","mine","ours","itself",
  "myself","yourself","himself","herself","themselves","ourselves",
]);

/**
 * Extracts meaningful keywords from text.
 * Filters stop words and short tokens, returns unique lowercase terms.
 */
function extractKeywords(text: string): string[] {
  return Array.from(new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  ));
}

/**
 * Compares user answer keywords against reference answer keywords.
 * Returns matched, missing, extra keywords and a coverage percentage.
 */
export function analyzeKeywords(
  userAnswer: string,
  referenceAnswer: string
): KeywordAnalysis {
  const refKeywords  = extractKeywords(referenceAnswer);
  const userKeywords = extractKeywords(userAnswer);

  const refSet  = new Set(refKeywords);
  const userSet = new Set(userKeywords);

  const matched = refKeywords.filter(k => userSet.has(k));
  const missing = refKeywords.filter(k => !userSet.has(k));
  const extra   = userKeywords.filter(k => !refSet.has(k));

  const coveragePercent = refKeywords.length > 0
    ? Math.round((matched.length / refKeywords.length) * 100)
    : 0;

  return { matched, missing, extra, coveragePercent };
}

// ── Scoring Helpers ───────────────────────────────────────────────────────────

/**
 * Cosine similarity-based relevance using bag-of-words.
 * Combines keyword coverage with lexical overlap.
 */
export function computeRelevanceScore(
  userAnswer: string,
  referenceAnswer: string
): number {
  if (!referenceAnswer || !userAnswer) return 0;

  const tokenize = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);

  const vocab    = Array.from(new Set([...tokenize(userAnswer), ...tokenize(referenceAnswer)]));
  const embed    = (text: string) => vocab.map(w => tokenize(text).filter(t => t === w).length);
  const embUser  = embed(userAnswer);
  const embRef   = embed(referenceAnswer);

  const dot  = embUser.reduce((s, v, i) => s + v * embRef[i], 0);
  const magA = Math.sqrt(embUser.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(embRef.reduce((s, v) => s + v * v, 0));

  const cosineSim = magA && magB ? dot / (magA * magB) : 0;

  // Blend cosine similarity with keyword coverage for a more robust score
  const { coveragePercent } = analyzeKeywords(userAnswer, referenceAnswer);
  const blended = cosineSim * 70 + (coveragePercent / 100) * 30;

  return Math.round(Math.min(100, Math.max(0, blended)));
}

function isGibberish(answer: string): boolean {
  const cleaned = answer
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();

  if (!cleaned) return true;

  const words = cleaned.split(/\s+/);

  // single random token like "eger"
  if (words.length === 1 && words[0].length < 8) {
    return true;
  }

  const vowels = /[aeiou]/g;
  let meaningfulWords = 0;

  for (const word of words) {
    const vowelCount = (word.match(vowels) || []).length;

    // random strings usually have very poor vowel structure
    if (word.length >= 3 && vowelCount >= 1) {
      meaningfulWords++;
    }
  }

  return meaningfulWords === 0;
}

function computeClarity(answer: string): number {
  if (!answer.trim()) return 0;

  // NEW FIX
  if (isGibberish(answer)) return 0;

  const words = answer.trim().split(/\s+/);
  const wordCount = words.length;

  const sentences = answer
    .split(/[.!?]+/)
    .filter(s => s.trim());

  const nSentences = Math.max(1, sentences.length);
  const hasPunct = /[.!?]/.test(answer);

  if (wordCount < 5) return 0;
  if (wordCount < 10) return 10;

  let base =
    wordCount < 25 ? 58 :
    wordCount < 50 ? 72 :
    wordCount < 120 ? 85 :
    wordCount < 200 ? 78 : 65;

  if (hasPunct && nSentences >= 2) {
    base += 5;
  }

  if (!hasPunct) {
    base -= 10;
  }

  return Math.max(0, Math.min(100, base));
}
function computeConfidence(answer: string): number {
  if (!answer.trim()) return 0;

  // NEW FIX
  if (isGibberish(answer)) return 0;

  const lower = answer.toLowerCase();
  const words = lower.split(/\s+/);

  // extremely short answers
  if (words.length < 3) {
    return 0;
  }

  const assertive = [
    "definitely",
    "clearly",
    "confident",
    "sure",
    "absolutely",
    "certainly",
    "i believe",
    "i am",
    "i have",
    "i led",
    "i managed",
    "successfully",
    "achieved",
    "delivered",
    "built",
    "demonstrated",
    "proven",
    "i know",
    "i can",
    "without doubt",
    "i will"
  ];

  const hedging = [
    "maybe",
    "perhaps",
    "i think",
    "not sure",
    "possibly",
    "kind of",
    "sort of",
    "i guess",
    "might be",
    "could be",
    "i'm not",
    "i don't know",
    "i hope",
    "somewhat"
  ];

  const hits = assertive.filter(p => lower.includes(p)).length;
  const hedges = hedging.filter(p => lower.includes(p)).length;

  let base = 50;

  // good answer length boost
  if (words.length > 20) {
    base += 15;
  }

  base += hits * 8;
  base -= hedges * 12;

  return Math.max(0, Math.min(100, base));
}
// ── Gemini Call ───────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * fetchRagQuestions
 * ─────────────────
 * Calls the FastAPI backend which runs the full RAG pipeline.
 * The backend now returns both question AND reference answer together.
 * We cache them in IndexedDB so re-renders don't trigger re-fetches.
 */
export async function fetchRagQuestions(jobTitle: string): Promise<RagQuestion[]> {
  // ── Step 1: Try the main RAG pipeline ───────────────────────────────────
  try {
    const res = await fetch(
      `http://127.0.0.1:8000/generate-questions/${encodeURIComponent(jobTitle)}`
    );

    if (!res.ok) throw new Error(`Backend error: ${res.status}`);

    const data  = await res.json();
    const items: { question: string; answer: string }[] = data.data ?? [];

    if (items.length === 0) throw new Error("RAG returned empty questions");

    const questions: RagQuestion[] = await Promise.all(
      items.map(async (item) => {
        const pair: RagQuestion = {
          question:        item.question,
          referenceAnswer: item.answer,
        };
        await cacheQAPair(pair);
        return pair;
      })
    );

    return questions;

  } catch (err) {
    console.warn("RAG pipeline failed, loading from dataset:", err);
  }

  // ── Step 2: Load from CSV dataset via fallback endpoint ─────────────────
  try {
    const res = await fetch(
      `http://127.0.0.1:8000/fallback-questions/${encodeURIComponent(jobTitle)}`
    );

    if (!res.ok) throw new Error(`Fallback endpoint error: ${res.status}`);

    const data  = await res.json();
    const items: { question: string; answer: string }[] = data.data ?? [];

    if (items.length === 0) throw new Error(`No dataset questions found for: ${jobTitle}`);

    const questions: RagQuestion[] = await Promise.all(
      items.map(async (item) => {
        const pair: RagQuestion = {
          question:        item.question,
          referenceAnswer: item.answer,
        };
        await cacheQAPair(pair);
        return pair;
      })
    );

    console.log(`✅ Loaded ${questions.length} questions from dataset for: ${jobTitle}`);
    return questions;

  } catch (err) {
    console.error("❌ Dataset fallback also failed:", err);
    // Return empty — let the UI handle the empty state
    return [];
  }
}
/**
 * evaluateInterview
 * ─────────────────
 * Scores each answer, runs keyword comparison, and asks Gemini for
 * a coaching paragraph that explicitly references matched/missing keywords.
 */
export async function evaluateInterview(
  answers: AnswerItem[]
): Promise<EvaluationResult> {
  if (!answers.length) {
    return { confidence: 0, clarity: 0, relevance: 0, overallFeedback: "", details: [] };
  }

  const details = await Promise.all(
    answers.map(async (item) => {
      // Retrieve reference answer — prefer what was passed in, fall back to cache
      let expectedAnswer = item.expectedAnswer;
      if (!expectedAnswer) {
        const cached = await getCachedQAPair(item.question);
        expectedAnswer = cached?.referenceAnswer ?? "";
      }

      // ── Compute scores ──────────────────────────────────────────────────
      const relevance  = computeRelevanceScore(item.userAnswer, expectedAnswer);
      const clarity    = computeClarity(item.userAnswer);
      const confidence = computeConfidence(item.userAnswer);

      // ── Keyword comparison ──────────────────────────────────────────────
      const keywordAnalysis = analyzeKeywords(item.userAnswer, expectedAnswer);

      const matchedStr = keywordAnalysis.matched.slice(0, 8).join(", ") || "none";
      const missingStr = keywordAnalysis.missing.slice(0, 8).join(", ") || "none";

      // ── Gemini coaching paragraph ───────────────────────────────────────
      const prompt = `You are an expert interview coach evaluating a candidate's answer.

Interview Question:
"${item.question}"

Candidate's Answer:
"${item.userAnswer}"

Ideal Reference Answer:
"${expectedAnswer}"

Keyword Analysis:
- Keywords the candidate covered: ${matchedStr}
- Important keywords the candidate missed: ${missingStr}
- Keyword coverage: ${keywordAnalysis.coveragePercent}%

Scores: Confidence ${confidence}/100 | Clarity ${clarity}/100 | Relevance ${relevance}/100

Write a coaching feedback paragraph (exactly 3 sentences, plain text, no bullet points, no headers):
Sentence 1: Acknowledge what the candidate did well, referencing specific covered keywords.
Sentence 2: Point out what was missing, explicitly mentioning the missing keywords by name.
Sentence 3: Give one concrete, actionable improvement tip for their next attempt.`;

      let feedback = "";
      try {
        feedback = await callGemini(prompt);
      } catch {
        // Fallback feedback built from keyword analysis
        const coveredNote = keywordAnalysis.matched.length > 0
          ? `You demonstrated understanding of ${matchedStr}.`
          : "Your answer lacked role-specific terminology.";
        const missingNote = keywordAnalysis.missing.length > 0
          ? `Key concepts missing from your answer include: ${missingStr}.`
          : "You covered the main concepts well.";
        feedback = `${coveredNote} ${missingNote} Try structuring your answer using the STAR method and incorporating the missing keywords naturally.`;
      }

      return {
        question: item.question,
        confidence,
        clarity,
        relevance,
        feedback,
        keywordAnalysis,
      };
    })
  );

  const n   = details.length;
  const avg = (key: "confidence" | "clarity" | "relevance") =>
    Math.round(details.reduce((s, d) => s + d[key], 0) / n);

  // ── Overall summary ─────────────────────────────────────────────────────
  const overallPrompt = `You are an interview coach. A candidate just completed a mock interview session.

Average scores — Confidence: ${avg("confidence")}/100, Clarity: ${avg("clarity")}/100, Relevance: ${avg("relevance")}/100.

In exactly 2 sentences: summarise their overall performance honestly but encouragingly,
then give ONE specific action item they should focus on before their next practice session.
Plain text only, no bullet points, no headers.`;

  let overallFeedback = "";
  try {
    overallFeedback = await callGemini(overallPrompt);
  } catch {
    overallFeedback = `Your average scores show ${avg("relevance") > 70 ? "strong" : "developing"} answer relevance with ${avg("confidence") > 70 ? "confident" : "room to improve"} delivery. Focus on incorporating role-specific keywords and using the STAR method consistently in your next practice session.`;
  }

  return {
    confidence: avg("confidence"),
    clarity:    avg("clarity"),
    relevance:  avg("relevance"),
    overallFeedback,
    details,
  };
}