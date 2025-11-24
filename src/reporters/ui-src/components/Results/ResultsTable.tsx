import React, { useState, useMemo } from 'react';
import { BarChart3, FlaskConical } from 'lucide-react';
import type { MCPEvalResult } from '../../types';

interface ResultsTableProps {
  results: MCPEvalResult[];
  onSelectResult?: (result: MCPEvalResult) => void;
}

export function ResultsTable({
  results,
  onSelectResult,
}: ResultsTableProps) {
  const [sortColumn, setSortColumn] = useState<
    'status' | 'id' | 'duration' | null
  >(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'eval' | 'test'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort results
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // Apply status filter
    if (filter === 'pass') {
      filtered = filtered.filter((r) => r.pass);
    } else if (filter === 'fail') {
      filtered = filtered.filter((r) => !r.pass);
    }

    // Apply source filter (tabs)
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((r) => r.source === sourceFilter);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        return (
          r.id.toLowerCase().includes(query) ||
          JSON.stringify(r.response).toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal, bVal;

        switch (sortColumn) {
          case 'status':
            aVal = a.pass ? 1 : 0;
            bVal = b.pass ? 1 : 0;
            break;
          case 'id':
            aVal = a.id;
            bVal = b.id;
            break;
          case 'duration':
            aVal = a.durationMs;
            bVal = b.durationMs;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [results, filter, sourceFilter, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: 'status' | 'id' | 'duration') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const evalCount = results.filter(r => r.source === 'eval').length;
  const testCount = results.filter(r => r.source === 'test').length;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b bg-card">
        <button
          onClick={() => setSourceFilter('all')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            sourceFilter === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
          }`}
        >
          All Results
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {results.length}
          </span>
        </button>
        <button
          onClick={() => setSourceFilter('eval')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            sourceFilter === 'eval'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
          }`}
        >
          <BarChart3 size={16} />
          Eval Datasets
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {evalCount}
          </span>
        </button>
        <button
          onClick={() => setSourceFilter('test')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            sourceFilter === 'test'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
          }`}
        >
          <FlaskConical size={16} />
          Test Suites
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {testCount}
          </span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-card border-b">
        <input
          type="text"
          placeholder="Search by case ID or response content..."
          className="flex-1 min-w-[250px] px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pass')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'pass'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Passed
          </button>
          <button
            onClick={() => setFilter('fail')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'fail'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredResults.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No results found
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-muted border-b-2">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort('status')}
                >
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                  Type
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort('id')}
                >
                  Case ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Tool Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Mode
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort('duration')}
                >
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => {
                const source = result.source || 'eval';
                const isEval = source === 'eval';

                return (
                  <tr
                    key={result.id}
                    onClick={() => onSelectResult?.(result)}
                    className={`border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                      isEval
                        ? 'border-l-4 border-l-blue-500/30 bg-blue-500/5'
                        : 'border-l-4 border-l-purple-500/30 bg-purple-500/5'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          result.pass
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {result.pass ? '✓ Pass' : '✗ Fail'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEval ? (
                        <BarChart3 size={18} className="inline-block text-blue-600 dark:text-blue-400" title="Eval Dataset" />
                      ) : (
                        <FlaskConical size={18} className="inline-block text-purple-600 dark:text-purple-400" title="Test Suite" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{result.id}</span>
                        <span className="text-xs text-muted-foreground">{result.datasetName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {result.toolName}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs bg-muted rounded">
                        {result.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {result.durationMs.toFixed(0)}ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
