'use client';

import { useRouter } from 'next/navigation';
import { LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <Button
      onClick={handleLogout}
      size="sm"
      variant="outline"
      className="border-slate-700 bg-slate-900/85 text-slate-100 shadow-sm backdrop-blur hover:bg-slate-800"
    >
      <LogOutIcon className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
}
