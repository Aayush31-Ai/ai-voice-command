const BASE_URL = 'http://localhost:8000';

export async function generateRoadmap(goal) {
  const response = await fetch(`${BASE_URL}/generate-roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Failed to generate roadmap');
  }
  return response.json();
}

export async function askFollowUp(question, roadmap) {
  const response = await fetch(`${BASE_URL}/follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, roadmap }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Failed to get answer');
  }
  return response.json();
}
