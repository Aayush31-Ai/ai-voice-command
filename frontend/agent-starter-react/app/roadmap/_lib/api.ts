const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

export interface RoadmapPhase {
  title: string;
  duration: string;
  topics: string[];
  projects: string[];
}

export interface Roadmap {
  id?: string;
  user_id?: string;
  goal: string;
  estimated_duration: string;
  phases: RoadmapPhase[];
  milestones: string[];
  next_actions: string[];
  created_at?: string;
  updated_at?: string;
}

async function request<T>(
  path: string,
  options: RequestInit,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function generateRoadmap(goal: string, token: string): Promise<Roadmap> {
  return request<Roadmap>(
    '/roadmap/generate',
    { method: 'POST', body: JSON.stringify({ goal }) },
    token,
  );
}

export async function listRoadmaps(token: string): Promise<Roadmap[]> {
  return request<Roadmap[]>('/roadmap/list', { method: 'GET' }, token);
}

export async function getRoadmap(id: string, token: string): Promise<Roadmap> {
  return request<Roadmap>(`/roadmap/${id}`, { method: 'GET' }, token);
}

export async function deleteRoadmap(id: string, token: string): Promise<void> {
  return request<void>(`/roadmap/${id}`, { method: 'DELETE' }, token);
}

export async function askFollowUp(
  question: string,
  roadmap: Roadmap,
  token: string,
): Promise<{ answer: string }> {
  return request<{ answer: string }>(
    '/roadmap/follow-up',
    { method: 'POST', body: JSON.stringify({ question, roadmap }) },
    token,
  );
}
