'use client';

import * as React from 'react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '@/lib/shadcn/utils';

const ResizablePanelGroup = (
  props: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>
) => (
  <ResizablePrimitive.PanelGroup
    {...props}
    className={cn('flex h-full w-full data-[panel-group-direction=vertical]:flex-col', props.className)}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  children,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle>) => (
  <ResizablePrimitive.PanelResizeHandle
    {...props}
    className={cn(
      'bg-border relative flex w-px items-center justify-center outline-none transition-colors focus-visible:bg-foreground/30 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full',
      props.className
    )}
  >
    {children ?? <div className="bg-border/80 size-6 rounded-full border shadow-sm" />}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
