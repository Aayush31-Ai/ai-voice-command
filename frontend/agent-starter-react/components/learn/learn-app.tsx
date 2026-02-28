'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenSource } from 'livekit-client';
import { useSession, useSessionContext } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { Session } from '@supabase/supabase-js';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { supabase } from '@/lib/supabase';
import { getSandboxTokenSource } from '@/lib/utils';
import { LearnWorkspace } from '@/components/learn/learn-workspace';
import { ViewController } from '@/components/app/view-controller';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function LearnAppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();
  return null;
}

function LearnAppContent({
  appConfig,
  supabaseSession,
  bookId,
}: {
  appConfig: AppConfig;
  supabaseSession: Session | null;
  bookId: string;
}) {
  const { isConnected } = useSessionContext();

  if (isConnected && supabaseSession) {
    return <LearnWorkspace accessToken={supabaseSession.access_token} bookId={bookId} />;
  }

  return (
    <main className="grid h-svh grid-cols-1 place-content-center">
      <ViewController appConfig={appConfig} />
    </main>
  );
}

interface LearnAppProps {
  appConfig: AppConfig;
  bookId: string;
}

export function LearnApp({ appConfig, bookId }: LearnAppProps) {
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSupabaseSession(data.session ?? null);
      setLoading(false);
      if (!data.session) router.push('/login');
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSupabaseSession(sess);
      if (!sess) router.push('/login');
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint('/api/connection-details');
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  if (loading) {
    return (
      <div className="flex h-svh items-center justify-center bg-slate-950 text-slate-100">
        Loading...
      </div>
    );
  }

  if (!supabaseSession) return null;

  return (
    <AgentSessionProvider session={session}>
      <LearnAppSetup />
      <LearnAppContent appConfig={appConfig} supabaseSession={supabaseSession} bookId={bookId} />
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{ warning: <WarningIcon weight="bold" /> }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
