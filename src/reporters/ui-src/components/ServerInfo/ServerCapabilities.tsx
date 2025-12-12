import React, { useState, useMemo } from 'react';
import { Wrench, ChevronDown, ChevronRight, Info } from 'lucide-react';
import type { MCPServerCapabilitiesData } from '../../types';

interface ServerCapabilitiesProps {
  serverCapabilities: MCPServerCapabilitiesData[];
}

interface ToolInfo {
  name: string;
  description?: string;
}

export function ServerCapabilities({
  serverCapabilities,
}: ServerCapabilitiesProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  // Deduplicate tools across all capability reports
  const uniqueTools = useMemo(() => {
    const toolMap = new Map<string, ToolInfo>();

    for (const cap of serverCapabilities) {
      for (const tool of cap.tools) {
        // Keep the first description we find for each tool
        if (!toolMap.has(tool.name)) {
          toolMap.set(tool.name, tool);
        }
      }
    }

    return Array.from(toolMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [serverCapabilities]);

  if (!serverCapabilities || serverCapabilities.length === 0) {
    return null;
  }

  const toggleExpanded = (toolName: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-blue-500/10 border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold">Server Capabilities</h3>
          </div>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {uniqueTools.length} tools available
          </span>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {uniqueTools.map((tool) => {
            const hasDescription = !!tool.description;
            const isExpanded = expandedTools.has(tool.name);

            if (!hasDescription) {
              // Simple display for tools without description
              return (
                <div
                  key={tool.name}
                  className="flex items-center gap-2 p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <code className="text-sm font-mono">{tool.name}</code>
                </div>
              );
            }

            // Expandable display for tools with description
            return (
              <div
                key={tool.name}
                className="rounded bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden"
              >
                <button
                  onClick={() => toggleExpanded(tool.name)}
                  className="w-full flex items-center gap-2 p-2 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <code className="text-sm font-mono truncate flex-1">
                    {tool.name}
                  </code>
                  <Info className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </button>
                {isExpanded && (
                  <div className="px-8 pb-2">
                    <p className="text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
