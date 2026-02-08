import React from 'react';
import { EnglishLevel } from '../types';

interface LevelSelectorProps {
  onSelect: (level: EnglishLevel) => void;
}

const levels: { id: EnglishLevel; label: string; desc: string }[] = [
  { id: 'A1', label: 'A1 - Beginner', desc: 'Basic phrases & everyday expressions' },
  { id: 'A2', label: 'A2 - Elementary', desc: 'Simple communication & routine tasks' },
  { id: 'B1', label: 'B1 - Intermediate', desc: 'Standard input on familiar matters' },
  { id: 'B2', label: 'B2 - Upper Intermediate', desc: 'Complex texts & fluent conversation' },
  { id: 'C1', label: 'C1 - Advanced', desc: 'Flexible use for social & professional' },
];

const LevelSelector: React.FC<LevelSelectorProps> = ({ onSelect }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-chatbg p-4 backdrop-blur-sm bg-white/30">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-primary p-6 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome to Aria</h2>
          <p className="opacity-90 text-sm">Select your English level / Vyberte si úroveň</p>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 no-scrollbar">
          <div className="grid gap-3">
            <button
              onClick={() => onSelect('TEST_ME')}
              className="w-full p-4 rounded-xl border-2 border-primary/20 bg-emerald-50 hover:bg-emerald-100 hover:border-primary transition-all group text-left"
            >
              <div className="font-bold text-primary mb-1">I'm not sure / Nevím</div>
              <div className="text-sm text-gray-600">Start a quick test to find out</div>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">Or select manual</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {levels.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => onSelect(lvl.id)}
                className="w-full p-3 rounded-xl border border-gray-100 hover:border-emerald-300 hover:shadow-md transition-all text-left bg-white"
              >
                <div className="font-bold text-gray-800">{lvl.label}</div>
                <div className="text-xs text-gray-500">{lvl.desc}</div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 text-center text-xs text-gray-400">
          Native language support: Czech (Čeština)
        </div>
      </div>
    </div>
  );
};

export default LevelSelector;
