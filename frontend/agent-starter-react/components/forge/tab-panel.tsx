'use client';

import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/shadcn/utils';
import { Button } from '@/components/ui/button';

interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabPanelProps {
  tabs: TabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  className?: string;
  actions?: ReactNode;
}

export function TabPanel({ tabs, activeTab, onTabChange, className, actions }: TabPanelProps) {
  const [internalTab, setInternalTab] = useState(tabs[0]?.id ?? '');
  const current = activeTab ?? internalTab;

  const handleChange = (id: string) => {
    setInternalTab(id);
    onTabChange?.(id);
  };

  const active = tabs.find((t) => t.id === current);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="shrink-0 flex items-center justify-between border-b border-slate-800 px-2 pt-2">
        <div className="flex">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={current === tab.id ? 'secondary' : 'ghost'}
              className={cn(
                'mr-1 rounded-b-none rounded-t-md border border-transparent text-xs',
                current === tab.id
                  ? 'border-cyan-300/40 bg-cyan-400/90 text-slate-950 hover:bg-cyan-300'
                  : 'text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100'
              )}
              onClick={() => handleChange(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        {actions && <div className="flex items-center gap-1 pb-1.5">{actions}</div>}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-3 text-sm">{active?.content}</div>
    </div>
  );
}
