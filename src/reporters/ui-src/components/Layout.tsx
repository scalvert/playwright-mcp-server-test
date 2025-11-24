import React from 'react';
import { Logo } from './Logo';
import { DarkModeToggle } from './DarkModeToggle';

interface LayoutProps {
  timestamp: string;
  platform: string;
  durationMs: number;
  children: React.ReactNode;
}

export function Layout({ timestamp, platform, durationMs, children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b bg-card">
        <div className="max-w-[1600px] mx-auto w-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="relative top-[5px]">
              <Logo size={40} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold">MCP Test Reporter</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold">
                {new Date(timestamp).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {durationMs.toFixed(0)}ms · {platform}
              </span>
            </div>
            <DarkModeToggle />
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
