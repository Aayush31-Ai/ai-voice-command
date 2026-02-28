import { headers } from 'next/headers';
import { LearnApp } from '@/components/learn/learn-app';
import { getAppConfig } from '@/lib/utils';

interface LearnBookPageProps {
  params: Promise<{ bookId: string }>;
}

export default async function LearnBookPage({ params }: LearnBookPageProps) {
  const { bookId } = await params;
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);

  return (
    <div className="relative min-h-svh bg-slate-950">
      <LearnApp appConfig={appConfig} bookId={bookId} />
    </div>
  );
}
