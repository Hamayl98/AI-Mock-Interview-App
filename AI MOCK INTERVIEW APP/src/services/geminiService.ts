export interface JobInfo {
  jobTitle: string;
  jobDescription: string;
  yearsOfExperience: string;
}

const API_BASE = "http://127.0.0.1:8000";

/**
 * Fetch RAG-generated interview questions from backend
 */
export async function generateInterviewQuestions(
  _interviewType: string,
  jobInfo: JobInfo
): Promise<string[]> {
  const role = jobInfo.jobTitle;

  const res = await fetch(
    `${API_BASE}/generate-questions/${encodeURIComponent(role)}`
  );

  if (!res.ok) {
    throw new Error("Failed to load interview questions");
  }

  const data = await res.json();

  // backend returns: { data: [{ question, answer }] }
  return data.data.map((item: any) => item.question);
}