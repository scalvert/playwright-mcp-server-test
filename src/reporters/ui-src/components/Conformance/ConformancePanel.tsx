import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronRight,
  Server,
} from 'lucide-react';
import type { MCPConformanceResultData } from '../../types';

interface ConformancePanelProps {
  conformanceChecks: MCPConformanceResultData[];
}

export function ConformancePanel({ conformanceChecks }: ConformancePanelProps) {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  if (!conformanceChecks || conformanceChecks.length === 0) {
    return null;
  }

  const allPassed = conformanceChecks.every((check) => check.pass);
  const passedCount = conformanceChecks.filter((check) => check.pass).length;

  const toggleExpanded = (testTitle: string) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(testTitle)) {
        next.delete(testTitle);
      } else {
        next.add(testTitle);
      }
      return next;
    });
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className={`px-4 py-3 border-b ${
          allPassed
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-amber-500/10 border-amber-500/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {allPassed ? (
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <ShieldX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <h3 className="font-semibold">MCP Conformance Checks</h3>
          </div>
          <span
            className={`text-sm font-medium ${
              allPassed
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {passedCount}/{conformanceChecks.length} passed
          </span>
        </div>
      </div>

      {/* Test Results */}
      <div className="divide-y">
        {conformanceChecks.map((check) => {
          const isExpanded = expandedTests.has(check.testTitle);
          const passedChecks = check.checks.filter((c) => c.pass).length;

          return (
            <div key={check.testTitle} className="bg-card">
              {/* Test Header */}
              <button
                onClick={() => toggleExpanded(check.testTitle)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span
                    className={`w-2 h-2 rounded-full ${
                      check.pass ? 'bg-green-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-medium text-sm">{check.testTitle}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {check.serverInfo && (
                    <span className="flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      {check.serverInfo.name || 'Unknown'}{' '}
                      {check.serverInfo.version &&
                        `v${check.serverInfo.version}`}
                    </span>
                  )}
                  <span>
                    {passedChecks}/{check.checks.length} checks
                  </span>
                  {check.authType && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        check.authType === 'oauth'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : check.authType === 'api-token'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {check.authType}
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded Checks */}
              {isExpanded && (
                <div className="px-4 pb-3 space-y-2 pl-12">
                  {check.checks.map((c, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 p-2 rounded text-sm ${
                        c.pass
                          ? 'bg-green-50 dark:bg-green-900/10'
                          : 'bg-red-50 dark:bg-red-900/10'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0 ${
                          c.pass ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          className={`font-mono text-xs ${
                            c.pass
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}
                        >
                          {c.name}
                        </span>
                        <p className="text-muted-foreground text-xs mt-0.5 break-words">
                          {c.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
