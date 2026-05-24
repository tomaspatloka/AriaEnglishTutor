import React, { useState } from 'react';
import { VocabularyEntry } from '../types';
import { removeVocabularyWord, clearVocabulary, addVocabularyWord } from '../utils/vocabularyUtils';

interface VocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabList: VocabularyEntry[];
  onVocabChange: (entries: VocabularyEntry[]) => void;
}

const VocabularyModal: React.FC<VocabularyModalProps> = ({ isOpen, onClose, vocabList, onVocabChange }) => {
  const [newWord, setNewWord] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    const updated = addVocabularyWord(trimmed);
    onVocabChange(updated);
    setNewWord('');
  };

  const handleRemove = (id: string) => {
    const updated = removeVocabularyWord(id);
    onVocabChange(updated);
  };

  const handleClearAll = () => {
    if (!confirm('Smazat celý slovníček?')) return;
    clearVocabulary();
    onVocabChange([]);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    // Escape user-controlled fields before document.write — slovo i definice mohou pocházet
    // z ruční editace; bez escapování jde o XSS (audit P1).
    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const rows = vocabList.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(e.word)}</strong></td>
        <td>${new Date(e.addedAt).toLocaleDateString('cs-CZ')}</td>
        <td>${escapeHtml(e.definition || '')}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Aria — Slovníček</title>
<style>
  body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#111}
  h1{color:#10b981;margin-bottom:4px}p.sub{color:#666;font-size:0.85em;margin:0 0 20px}
  table{width:100%;border-collapse:collapse}
  th{background:#f3f4f6;padding:8px 12px;text-align:left;border:1px solid #e5e7eb;font-size:.85em;text-transform:uppercase;letter-spacing:.05em}
  td{padding:8px 12px;border:1px solid #e5e7eb;vertical-align:top}
  tr:nth-child(even){background:#fafafa}
</style></head><body>
<h1>📚 Aria — Slovníček</h1>
<p class="sub">Export: ${new Date().toLocaleDateString('cs-CZ')} · ${vocabList.length} slov</p>
<table><thead><tr><th>#</th><th>Slovo</th><th>Přidáno</th><th>Poznámka</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-16 bottom-16 z-[201] max-w-xl mx-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white font-black text-base">📚 Slovníček</h2>
            <p className="text-slate-400 text-xs mt-0.5">{vocabList.length} {vocabList.length === 1 ? 'slovo' : vocabList.length < 5 ? 'slova' : 'slov'}</p>
          </div>
          <div className="flex items-center gap-2">
            {vocabList.length > 0 && (
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg text-xs font-bold hover:bg-blue-500/30 transition active:scale-95"
              >
                🖨 Tisk
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Add word */}
        <div className="px-5 py-3 border-b border-white/10 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="+ Přidat slovo ručně..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-400/50"
            />
            <button
              onClick={handleAdd}
              disabled={!newWord.trim()}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
            >
              Přidat
            </button>
          </div>
        </div>

        {/* Word list */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
          {vocabList.length === 0 && (
            <div className="text-center mt-8 text-slate-500">
              <p className="text-4xl mb-3">📖</p>
              <p className="text-sm font-semibold">Slovníček je prázdný</p>
              <p className="text-xs mt-1">Řekni Arii: "I don't know the word X"<br/>nebo přidej slovo ručně výše</p>
            </div>
          )}
          {vocabList.map((entry, idx) => (
            <div key={entry.id} className="flex items-start gap-3 bg-white/5 rounded-xl px-4 py-3 group hover:bg-white/8 transition">
              <span className="text-slate-600 text-xs font-bold mt-0.5 w-5 shrink-0">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">{entry.word}</p>
                {entry.definition && (
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{entry.definition}</p>
                )}
                <p className="text-slate-600 text-[10px] mt-0.5">{new Date(entry.addedAt).toLocaleDateString('cs-CZ')}</p>
              </div>
              <button
                onClick={() => handleRemove(entry.id)}
                className="p-1.5 text-slate-700 hover:text-red-400 transition shrink-0 sm:opacity-0 sm:group-hover:opacity-100"
                title="Smazat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        {vocabList.length > 0 && (
          <div className="px-5 py-3 border-t border-white/10 shrink-0 flex justify-end">
            <button onClick={handleClearAll} className="text-xs text-red-400/60 hover:text-red-400 transition font-semibold">
              Smazat vše
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default VocabularyModal;
