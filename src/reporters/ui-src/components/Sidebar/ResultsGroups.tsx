import React, { useState } from 'react';
import { BarChart3, FlaskConical, ChevronDown, ChevronRight } from 'lucide-react';
import type { MCPEvalResult } from '../../types';

interface ResultsGroupsProps {
  results: MCPEvalResult[];
  selectedEval?: string;
  selectedTest?: string;
  onSelectEval?: (group: string | undefined) => void;
  onSelectTest?: (group: string | undefined) => void;
}

interface GroupCounts {
  passed: number;
  failed: number;
}

export function ResultsGroups({
  results,
  selectedEval,
  selectedTest,
  onSelectEval,
  onSelectTest,
}: ResultsGroupsProps) {
  const [evalsExpanded, setEvalsExpanded] = useState(true);
  const [testsExpanded, setTestsExpanded] = useState(true);
  const [evalFilter, setEvalFilter] = useState('');
  const [testFilter, setTestFilter] = useState('');

  // Separate results by source
  const evalResults = results.filter((r) => r.source === 'eval' || !r.source); // Backward compat
  const testResults = results.filter((r) => r.source === 'test');

  // Group evals by dataset name
  const groupEvals = (results: MCPEvalResult[]) => {
    const groups: Record<string, GroupCounts> = {};

    results.forEach((result) => {
      const datasetName = result.datasetName || 'Unknown Dataset';

      if (!groups[datasetName]) {
        groups[datasetName] = { passed: 0, failed: 0 };
      }

      if (result.pass) {
        groups[datasetName].passed++;
      } else {
        groups[datasetName].failed++;
      }
    });

    return groups;
  };

  // Group tests by suite name (test.parent.title)
  const groupTests = (results: MCPEvalResult[]) => {
    const groups: Record<string, GroupCounts> = {};

    results.forEach((result) => {
      const suiteName = result.datasetName || 'Direct API Tests';

      if (!groups[suiteName]) {
        groups[suiteName] = { passed: 0, failed: 0 };
      }

      if (result.pass) {
        groups[suiteName].passed++;
      } else {
        groups[suiteName].failed++;
      }
    });

    return groups;
  };

  const evalGroups = groupEvals(evalResults);
  const testGroups = groupTests(testResults);

  const evalGroupNames = Object.keys(evalGroups)
    .sort()
    .filter((name) => name.toLowerCase().includes(evalFilter.toLowerCase()));

  const testGroupNames = Object.keys(testGroups)
    .sort()
    .filter((name) => name.toLowerCase().includes(testFilter.toLowerCase()));

  const renderGroupButton = (
    groupName: string,
    group: GroupCounts,
    isActive: boolean,
    onClick: () => void,
    tooltip?: string
  ) => (
    <button
      key={groupName}
      onClick={onClick}
      title={tooltip}
      className={`
        flex w-full items-center justify-between rounded-md px-3 py-2 text-sm
        transition-colors
        ${
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        }
      `}
    >
      <span className="text-xs truncate">{groupName}</span>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <span className="text-xs text-green-600 dark:text-green-400">
          {group.passed}
        </span>
        {group.failed > 0 && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {group.failed}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Evals Section */}
      {evalResults.length > 0 && (
        <div className="px-3 mt-6">
          <button
            onClick={() => setEvalsExpanded(!evalsExpanded)}
            className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
              <span>Eval Datasets</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({Object.keys(evalGroups).length})
              </span>
            </div>
            {evalsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {evalsExpanded && (
            <div className="mt-2 space-y-1">
              {/* Search filter */}
              {Object.keys(evalGroups).length > 3 && (
                <div className="px-3 mb-2">
                  <input
                    type="text"
                    placeholder="Filter eval datasets..."
                    value={evalFilter}
                    onChange={(e) => setEvalFilter(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* "All Datasets" option */}
              <button
                onClick={() => onSelectEval?.(undefined)}
                className={`
                  flex w-full items-center justify-between rounded-md px-3 py-2 text-sm
                  transition-colors
                  ${
                    !selectedEval
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  }
                `}
              >
                <span>All Datasets</span>
                <span className="text-xs opacity-75">{evalResults.length}</span>
              </button>

              {/* Individual eval datasets */}
              {evalGroupNames.map((groupName) =>
                renderGroupButton(
                  groupName,
                  evalGroups[groupName],
                  selectedEval === groupName,
                  () => onSelectEval?.(groupName),
                  `Eval dataset: ${groupName}`
                )
              )}

              {evalFilter && evalGroupNames.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  No matching datasets
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tests Section */}
      {testResults.length > 0 && (
        <div className="px-3">
          <button
            onClick={() => setTestsExpanded(!testsExpanded)}
            className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FlaskConical size={18} className="text-purple-600 dark:text-purple-400" />
              <span>Test Suites</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({Object.keys(testGroups).length})
              </span>
            </div>
            {testsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {testsExpanded && (
            <div className="mt-2 space-y-1">
              {/* Search filter */}
              {Object.keys(testGroups).length > 3 && (
                <div className="px-3 mb-2">
                  <input
                    type="text"
                    placeholder="Filter test suites..."
                    value={testFilter}
                    onChange={(e) => setTestFilter(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* "All Suites" option */}
              <button
                onClick={() => onSelectTest?.(undefined)}
                className={`
                  flex w-full items-center justify-between rounded-md px-3 py-2 text-sm
                  transition-colors
                  ${
                    !selectedTest
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  }
                `}
              >
                <span>All Suites</span>
                <span className="text-xs opacity-75">{testResults.length}</span>
              </button>

              {/* Individual test suites */}
              {testGroupNames.map((groupName) =>
                renderGroupButton(
                  groupName,
                  testGroups[groupName],
                  selectedTest === groupName,
                  () => onSelectTest?.(groupName),
                  `Test suite (describe block): ${groupName}`
                )
              )}

              {testFilter && testGroupNames.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  No matching suites
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {evalResults.length === 0 && testResults.length === 0 && (
        <div className="px-6 py-8 text-center text-muted-foreground">
          <p className="text-sm">No results to display</p>
        </div>
      )}
    </div>
  );
}
