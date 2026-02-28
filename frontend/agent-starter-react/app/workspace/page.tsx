import { headers } from 'next/headers';
import { App } from '@/components/app/app';
import { getAppConfig } from '@/lib/utils';

export default async function WorkspacePage() {
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);

  return (
    <div className="relative min-h-svh bg-slate-950">
      <App appConfig={appConfig} />
    </div>
  );
}
