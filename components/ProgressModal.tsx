import React from 'react';
import { LessonHistoryEntry, ProgressStats, SessionSummary } from '../types';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateSummary: () => void;
  isGeneratingSummary: boolean;
  latestSummary: SessionSummary | null;
  history: LessonHistoryEntry[];
  stats: ProgressStats;
  notice: string | null;
}

const formatMinutes = (ms: number) => `${Math.max(0, Math.round(ms / 60000))} min`;

const trendLabel = (trend: ProgressStats['correctionTrend']) => {
  if (trend === 'improving') return 'Zlepseni';
  if (trend === 'worsening') return 'Zhorseni';
  if (trend === 'stable') return 'Stabilni';
  return 'Nedostatek dat';
};

const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  onClose,
  onGenerateSummary,
  isGeneratingSummary,
  latestSummary,
  history,
  stats,
  notice,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-4 flex items-center justify-between sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Session Progress</h2>
            <p className="text-[11px] text-gray-500 font-semibold">Souhrn lekci a trend</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 no-scrollbar pb-24">
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[10px] uppercase font-black text-emerald-600">Lekce</p>
              <p className="text-xl font-black text-emerald-800">{stats.totalLessons}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
              <p className="text-[10px] uppercase font-black text-blue-600">Streak</p>
              <p className="text-xl font-black text-blue-800">{stats.streakDays} dnu</p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
              <p className="text-[10px] uppercase font-black text-amber-600">Cas mluveni</p>
              <p className="text-xl font-black text-amber-800">{formatMinutes(stats.totalSpeakingMs)}</p>
            </div>
            <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3">
              <p className="text-[10px] uppercase font-black text-violet-600">Trend chyb</p>
              <p className="text-sm font-black text-violet-800">{trendLabel(stats.correctionTrend)}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-100 p-4 bg-gray-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-gray-900">Session summary po hovoru</h3>
                <p className="text-[11px] text-gray-500">Co bylo dobre, chyby a vety na procviceni</p>
              </div>
              <button
                onClick={onGenerateSummary}
                disabled={isGeneratingSummary}
                className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 disabled:opacity-60"
              >
                {isGeneratingSummary ? 'Generuji...' : 'Vytvorit summary'}
              </button>
            </div>

            {notice && (
              <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                {notice}
              </p>
            )}

            {latestSummary ? (
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <p className="font-black text-emerald-700 mb-1">Co bylo dobre</p>
                  <ul className="space-y-1 text-gray-700">
                    {latestSummary.strengths.map((item, idx) => <li key={`s-${idx}`}>- {item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-black text-rose-700 mb-1">3 nejcastejsi chyby</p>
                  <ul className="space-y-1 text-gray-700">
                    {latestSummary.commonErrors.map((item, idx) => <li key={`e-${idx}`}>- {item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-black text-indigo-700 mb-1">3 vety k treninku</p>
                  <ul className="space-y-1 text-gray-700">
                    {latestSummary.practiceSentences.map((item, idx) => <li key={`p-${idx}`}>- {item}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">Summary zatim neni k dispozici.</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-black text-gray-900 mb-2">Posledni lekce</h3>
            <div className="space-y-2">
              {history.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-100 p-3 bg-white flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-gray-800">
                      {new Date(item.endedAt).toLocaleString()} - {item.mode === 'live-api' ? 'Live' : 'Standard'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Delka: {formatMinutes(item.durationMs)} - Mluveni: {formatMinutes(item.speakingMs)} - Opravy: {item.correctionCount}
                    </p>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-xs text-gray-500">Historie je zatim prazdna.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProgressModal;
