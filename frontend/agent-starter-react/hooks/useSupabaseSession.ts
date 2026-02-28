'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}
