import React from 'react';
import { Scenario } from '../types';
import { SCENARIOS } from '../constants';

interface ScenarioSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenarioId: string | null;
  onSelect: (scenario: Scenario | null) => void;
}

const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({ isOpen, onClose, activeScenarioId, onSelect }) => {
  if (!isOpen) return null;

  const handleSelect = (scenario: Scenario | null) => {
    onSelect(scenario);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        <div className="p-4 flex items-center justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="ml-2">
            <h2 className="text-lg font-black text-gray-900">Scenarios</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vyberte situaci pro konverzaci</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto no-scrollbar pb-8">
          {/* Free conversation option */}
          <button
            onClick={() => handleSelect(null)}
            className={`w-full mb-3 p-4 rounded-2xl border-2 flex items-center gap-3 transition-all active:scale-[0.98] ${
              activeScenarioId === null
                ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                : 'border-gray-100 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl shrink-0">💬</div>
            <div className="text-left flex-1">
              <p className={`text-sm font-black ${activeScenarioId === null ? 'text-emerald-700' : 'text-gray-800'}`}>Free Conversation</p>
              <p className="text-[11px] text-gray-400">Volná konverzace bez scénáře</p>
            </div>
            {activeScenarioId === null && (
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s)}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-[0.96] ${
                  activeScenarioId === s.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="text-3xl">{s.icon}</span>
                <div className="text-center">
                  <p className={`text-xs font-black leading-tight ${activeScenarioId === s.id ? 'text-emerald-700' : 'text-gray-700'}`}>{s.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.labelCz}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioSelector;
