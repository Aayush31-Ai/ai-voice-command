'use client';

/**
 * VoiceForgeSession - wraps the VoiceForge workspace inside an active
 * LiveKit session so the workspace can consume useSessionMessages().
 * Also bridges the Supabase access token into the workspace.
 */
import { useSessionContext } from '@livekit/components-react';
import { VoiceForgeWorkspace } from '@/components/forge/workspace';

interface VoiceForgeSessionProps {
  accessToken: string;
  projectId: string;
}

export function VoiceForgeSession({ accessToken, projectId }: VoiceForgeSessionProps) {
  // We only render this when the session is connected
  const { isConnected } = useSessionContext();
  if (!isConnected) return null;

  return <VoiceForgeWorkspace accessToken={accessToken} projectId={projectId} />;
}
