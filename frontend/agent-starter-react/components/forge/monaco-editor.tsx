'use client';

import { useState } from 'react';
import Editor, { type OnChange, type OnMount } from '@monaco-editor/react';
import { cn } from '@/lib/shadcn/utils';
import type { LanguageType } from '@/lib/voiceforge-api';

interface MonacoEditorProps {
  value: string;
  language: LanguageType;
  onChange?: (value: string) => void;
  className?: string;
}

export function MonacoEditor({ value, language, onChange, className }: MonacoEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  const handleMount: OnMount = () => {
    setIsMounted(true);
  };

  const handleChange: OnChange = (newValue) => {
    onChange?.(newValue ?? '');
  };

  return (
    <div className={cn('flex h-full w-full flex-1 overflow-hidden rounded-md border', className)}>
      {!isMounted && (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Loading editor…
        </div>
      )}
      <Editor
        height="100%"
        language={language === 'html' ? 'html' : 'python'}
        value={value}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderLineHighlight: 'gutter',
          tabSize: 4,
        }}
        onMount={handleMount}
        onChange={handleChange}
      />
    </div>
  );
}
