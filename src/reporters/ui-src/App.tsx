import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { MCPEvalData, MCPEvalResult } from './types';
import { Layout } from './components/Layout';
import { MetricsCards } from './components/Dashboard/MetricsCards';
import { ResultsTable } from './components/Results/ResultsTable';
import { DetailModal } from './components/Results/DetailModal';

function App() {
  const data: MCPEvalData = window.MCP_EVAL_DATA || {
    runData: {
      timestamp: new Date().toISOString(),
      durationMs: 0,
      environment: { ci: false, node: '', platform: '' },
      metrics: {
        total: 0,
        passed: 0,
        failed: 0,
        passRate: 0,
      },
      results: [],
    },
    historical: [],
  };

  const [selectedResult, setSelectedResult] = useState<MCPEvalResult | null>(
    null
  );

  return (
    <>
      <Layout
        timestamp={data.runData.timestamp}
        platform={data.runData.environment.platform}
        durationMs={data.runData.durationMs}
      >
        <div className="max-w-[1600px] mx-auto p-6 h-full flex flex-col gap-6">
          {/* Dashboard */}
          <MetricsCards
            results={data.runData.results}
          />

          {/* Results Table */}
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden flex-1 min-h-0">
            <ResultsTable
              results={data.runData.results}
              onSelectResult={setSelectedResult}
            />
          </div>
        </div>
      </Layout>

      {/* Detail Modal */}
      <DetailModal
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />
    </>
  );
}

// Initialize React app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
