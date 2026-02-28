// Re-export the token route handler at the path expected by LiveKit components.
// LearnApp and other components use TokenSource.endpoint('/api/connection-details').
export { POST } from '@/app/api/token/route';
