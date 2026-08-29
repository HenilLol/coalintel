import React from 'react';
import { BarChart3, Cloud, Layers, Hash } from 'lucide-react';
import { Card } from '../components/common/Card';

export const AnalyticsPage = () => {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          Mining Intelligence & Word Cloud Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          TF-IDF term frequency analysis and mining metric distribution across CIL subsidiaries
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="TF-IDF Term Extraction Matrix">
          <div className="space-y-3">
            {[
              { term: 'Overburden Removal (OBR)', freq: 412, score: '0.942' },
              { term: 'Opencast Production MT', freq: 384, score: '0.910' },
              { term: 'Coal Washing Capacity', freq: 215, score: '0.840' },
              { term: 'Stripping Ratio M.Cu.M/T', freq: 198, score: '0.795' },
              { term: 'Environmental Clearance', freq: 142, score: '0.710' },
            ].map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-700/60 rounded-lg text-xs">
                <div className="font-semibold text-white">{t.term}</div>
                <div className="flex items-center space-x-3 text-slate-400 font-mono">
                  <span>Count: {t.freq}</span>
                  <span className="text-amber-400">TF-IDF: {t.score}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Mining Entity Recognition Breakdown">
          <div className="p-6 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Cloud className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-white">Entity Recognition Engine</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Automatically identifies Opencast Mines, Coalfields, Subsidiaries (ECL, BCCL, CCL, WCL, SECL, NCL, MCL), and Target Metrics from ingested documents.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
