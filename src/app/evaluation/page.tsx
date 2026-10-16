'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Database,
  ArrowLeft,
  Clock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface TestResult {
  id: string;
  category: string;
  testCase: string;
  expectedOutcome: string;
  status: 'PASSED' | 'FAILED';
  evidence: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  successRate: string;
  executionTimeMs: number;
  academicReference: string;
}

export default function EvaluationPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-suite');
      const data = await res.json();
      setSummary(data.summary);
      setResults(data.results || []);
    } catch (err) {
      console.error('Failed to run test suite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Breadcrumb & Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                Section 16 Evaluation
              </span>
              <span className="text-xs text-slate-400">MAIT B.Tech IT Minor Project</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Automated Testing & Verification Suite
            </h1>
          </div>

          <button
            onClick={runTests}
            disabled={loading}
            className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Executing Test Cases...' : 'Re-run Evaluation Suite'}</span>
          </button>
        </div>

        {/* Metric Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium">Tests Evaluated</span>
              <div className="text-2xl font-bold text-white mt-1">{summary.total}</div>
            </div>

            <div className="p-4 bg-slate-900 border border-emerald-900/50 rounded-2xl">
              <span className="text-[11px] text-emerald-400 font-medium">Passed Scenarios</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{summary.passed}</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium">Pass Rate</span>
              <div className="text-2xl font-bold text-blue-400 mt-1">{summary.successRate}</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> Latency
              </span>
              <div className="text-2xl font-bold text-slate-200 mt-1">{summary.executionTimeMs} ms</div>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">
                Test Cases & Observed Outcomes (Table from Paper Page 12-13)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Live REST & DB Execution
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 overflow-x-auto text-xs">
            {results.map((r) => (
              <div key={r.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850 transition">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {r.id}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {r.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{r.testCase}</h4>
                  <p className="text-slate-400 text-xs">
                    <strong className="text-slate-300">Expected:</strong> {r.expectedOutcome}
                  </p>
                  <p className="font-mono text-[11px] text-emerald-400/90 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 inline-block">
                    Evidence: {r.evidence}
                  </p>
                </div>

                <div className="sm:self-center">
                  {r.status === 'PASSED' ? (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PASSED</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-lg text-xs">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>FAILED</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
