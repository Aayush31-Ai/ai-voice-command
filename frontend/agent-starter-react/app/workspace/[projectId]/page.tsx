import { headers } from 'next/headers';
import { App } from '@/components/app/app';
import { getAppConfig } from '@/lib/utils';

interface WorkspacePageProps {
  params: Promise<{ projectId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { projectId } = await params;
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);

  return (
    <div className="relative min-h-svh bg-slate-950">
      <App appConfig={appConfig} projectId={projectId} />
    </div>
  );
}
