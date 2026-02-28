'use client';

export type IntentType = 'generate' | 'debug' | 'explain' | 'run' | 'refactor';
export type LanguageType = 'python' | 'html';

export interface PlanResponse {
  language: LanguageType;
  plan: string[];
  approach: string;
}

export interface CodeResponse {
  language: LanguageType;
  code: string;
}

export interface SummaryResponse {
  what_it_does: string;
  key_components: string;
  how_to_extend: string;
}

export interface AssistantSummaryContent {
  what_it_does: string;
  components: string;
  flow: string;
}

export type AssistantResponse =
  | {
      type: 'code';
      language: LanguageType;
      content: string;
    }
  | {
      type: 'summary';
      content: AssistantSummaryContent;
    };

export interface AIProcessResponse {
  intent: IntentType;
  plan?: PlanResponse;
  code?: CodeResponse;
  summary?: SummaryResponse;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  name: string;
  language: LanguageType;
  code: string;
  updated_at?: string;
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

async function request<T>(path: string, options: RequestInit, accessToken?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  const res = await fetch(`${BACKEND}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

export async function fetchPlan(prompt: string, token: string): Promise<AIProcessResponse> {
  return request<AIProcessResponse>(
    '/ai/process',
    { method: 'POST', body: JSON.stringify({ prompt, stage: 'plan' }) },
    token
  );
}

export async function fetchGenerate(prompt: string, token: string): Promise<AIProcessResponse> {
  return request<AIProcessResponse>(
    '/ai/process',
    { method: 'POST', body: JSON.stringify({ prompt, stage: 'generate' }) },
    token
  );
}

export async function runCode(code: string, token: string): Promise<RunResult> {
  return request<RunResult>(
    '/ai/run',
    { method: 'POST', body: JSON.stringify({ code }) },
    token
  );
}

export async function listProjects(token: string): Promise<ProjectRecord[]> {
  return request<ProjectRecord[]>('/projects', { method: 'GET' }, token);
}

export async function getProject(id: string, token: string): Promise<ProjectRecord> {
  return request<ProjectRecord>(`/projects/${id}`, { method: 'GET' }, token);
}

export async function deleteProject(id: string, token: string): Promise<void> {
  await request<void>(`/projects/${id}`, { method: 'DELETE' }, token);
}

export async function createProject(
  name: string,
  language: LanguageType,
  code: string,
  token: string
): Promise<ProjectRecord> {
  return request<ProjectRecord>(
    '/projects',
    { method: 'POST', body: JSON.stringify({ name, language, code }) },
    token
  );
}

export async function updateProject(
  id: string,
  changes: Partial<{ name: string; language: LanguageType; code: string }>,
  token: string
): Promise<ProjectRecord> {
  return request<ProjectRecord>(
    `/projects/${id}`,
    { method: 'PUT', body: JSON.stringify(changes) },
    token
  );
}

// ── Learn Books ───────────────────────────────────────────────────────────────

export interface LearnBookRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  language: LanguageType;
  code: string;
  has_pdf: boolean;
  pdf_collection_name?: string;
  updated_at?: string;
}

export interface LearnCodeResponse {
  language: LanguageType;
  code: string;
  detailed_explanation: string;
  step_by_step: string[];
  key_concepts: string[];
  rag_sources?: string[];
}

export interface LearnAIProcessResponse {
  intent: IntentType;
  plan?: PlanResponse;
  learn_response?: LearnCodeResponse;
}

export interface PdfUploadResponse {
  collection_name: string;
  chunks_indexed: number;
}

export async function listLearnBooks(token: string): Promise<LearnBookRecord[]> {
  return request<LearnBookRecord[]>('/learn-books', { method: 'GET' }, token);
}

export async function getLearnBook(id: string, token: string): Promise<LearnBookRecord> {
  return request<LearnBookRecord>(`/learn-books/${id}`, { method: 'GET' }, token);
}

export async function createLearnBook(
  data: { name: string; description?: string; language: LanguageType; code?: string },
  token: string
): Promise<LearnBookRecord> {
  return request<LearnBookRecord>(
    '/learn-books',
    { method: 'POST', body: JSON.stringify(data) },
    token
  );
}

export async function updateLearnBook(
  id: string,
  changes: Partial<{ name: string; description: string; language: LanguageType; code: string }>,
  token: string
): Promise<LearnBookRecord> {
  return request<LearnBookRecord>(
    `/learn-books/${id}`,
    { method: 'PUT', body: JSON.stringify(changes) },
    token
  );
}

export async function deleteLearnBook(id: string, token: string): Promise<void> {
  await request<void>(`/learn-books/${id}`, { method: 'DELETE' }, token);
}

export async function uploadLearnBookPdf(
  bookId: string,
  file: File,
  token: string
): Promise<PdfUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BACKEND}/learn-books/${bookId}/upload-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<PdfUploadResponse>;
}

export async function fetchLearnGenerate(
  bookId: string,
  prompt: string,
  token: string
): Promise<LearnAIProcessResponse> {
  return request<LearnAIProcessResponse>(
    `/learn-books/${bookId}/ai/process`,
    { method: 'POST', body: JSON.stringify({ prompt, stage: 'generate' }) },
    token
  );
}
