import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VocabularyEntry, RecallSessionResult } from '../types';
import {
  removeVocabularyWord,
  clearVocabulary,
  addVocabularyWord,
  addVocabularyWordWithDefinition,
  addManyVocabularyWords,
  updateVocabularyDefinition,
  buildRecallQueue,
  recordRecallResult,
  statusLabel,
  statusColors,
  countDueForRefresh,
} from '../utils/vocabularyUtils';
import { translateWord } from '../services/geminiService';

interface VocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabList: VocabularyEntry[];
  onVocabChange: (entries: VocabularyEntry[]) => void;
  onSpeak?: (text: string) => void; // P1-8: TTS slova z karty (hlas dle settings, prop z App)
}

type ViewMode = 'list' | 'recall' | 'recall-summary';
type RecallDirection = 'en-cz' | 'cz-en' | 'mix'; // P1-8: směr flashcards

// Maličká pomocná komponenta — bezpečně vrátí do listu bez setState-during-render.
const RecallEmptyGuard: React.FC<{ onEmpty: () => void }> = ({ onEmpty }) => {
  useEffect(() => { onEmpty(); }, [onEmpty]);
  return null;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const VocabularyModal: React.FC<VocabularyModalProps> = ({ isOpen, onClose, vocabList, onVocabChange, onSpeak }) => {
  // List state
  const [newWord, setNewWord] = useState('');
  const [customMeaning, setCustomMeaning] = useState('');
  const [showCustomMeaning, setShowCustomMeaning] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingTranslateIds, setPendingTranslateIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDefinitionDraft, setEditDefinitionDraft] = useState('');
  const newWordInputRef = useRef<HTMLInputElement>(null);

  // F-B1 — skrýt zvládnutá slova v list view + pill bar. Default ON.
  const [hideMastered, setHideMastered] = useState(true);

  // F-A2 — bulk paste UI
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  // Recall state
  const [view, setView] = useState<ViewMode>('list');
  const [includeMastered, setIncludeMastered] = useState(false);
  const [queue, setQueue] = useState<VocabularyEntry[]>([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionResult, setSessionResult] = useState<RecallSessionResult>({ total: 0, correct: 0, incorrect: 0, skipped: 0 });
  const [recallDirection, setRecallDirection] = useState<RecallDirection>('mix'); // P1-8: default Mix

  // Autofocus na input při otevření prázdného listu
  useEffect(() => {
    if (isOpen && view === 'list' && vocabList.length === 0) {
      const t = setTimeout(() => newWordInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen, view, vocabList.length]);

  // Reset interních stavů při zavření
  useEffect(() => {
    if (!isOpen) {
      setNewWord('');
      setCustomMeaning('');
      setShowCustomMeaning(false);
      setSearch('');
      setEditingId(null);
      setView('list');
      setQueue([]);
      setQueueIdx(0);
      setFlipped(false);
    }
  }, [isOpen]);

  // ─── Memoized values (MUST be before any early return — React hooks rule) ─

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = hideMastered ? vocabList.filter(e => e.status !== 'mastered') : vocabList;
    if (!q) return base;
    return base.filter(e =>
      e.word.toLowerCase().includes(q) ||
      (e.definition && e.definition.toLowerCase().includes(q))
    );
  }, [vocabList, search, hideMastered]);

  const counts = useMemo(() => {
    const c = { new: 0, learning: 0, mastered: 0 };
    vocabList.forEach(e => { c[e.status]++; });
    return c;
  }, [vocabList]);

  const dueForRefreshCount = useMemo(() => countDueForRefresh(vocabList), [vocabList]);

  if (!isOpen) return null;

  // ─── List actions ────────────────────────────────────────────────

  const handleAdd = async () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    const meaningOverride = customMeaning.trim();
    setNewWord('');
    setCustomMeaning('');
    setShowCustomMeaning(false);

    if (meaningOverride) {
      const updated = addVocabularyWord(trimmed, meaningOverride);
      onVocabChange(updated);
      return;
    }

    // Auto-překlad přes Gemini — vytvoř entry hned, definition doplň async
    const optimistic = addVocabularyWord(trimmed);
    onVocabChange(optimistic);
    const newlyAdded = optimistic.find(e => e.word.toLowerCase() === trimmed.toLowerCase());
    if (!newlyAdded) return;
    setPendingTranslateIds(prev => new Set(prev).add(newlyAdded.id));
    try {
      await addVocabularyWordWithDefinition(trimmed, () => translateWord(trimmed), onVocabChange);
    } finally {
      setPendingTranslateIds(prev => {
        const next = new Set(prev);
        next.delete(newlyAdded.id);
        return next;
      });
    }
  };

  const handleRemove = (id: string) => {
    const updated = removeVocabularyWord(id);
    onVocabChange(updated);
    if (editingId === id) setEditingId(null);
  };

  const handleClearAll = () => {
    if (!confirm('Smazat celý slovníček?')) return;
    clearVocabulary();
    onVocabChange([]);
  };

  const handleBulkAdd = async () => {
    const text = bulkText.trim();
    if (!text || bulkBusy) return;
    setBulkBusy(true);
    try {
      const added = await addManyVocabularyWords(
        text,
        (w) => translateWord(w),
        onVocabChange
      );
      if (added > 0) {
        setBulkText('');
        setShowBulk(false);
      } else {
        // Žádné nové slovo → ponech text, ať uživatel vidí
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const handleStartEdit = (entry: VocabularyEntry) => {
    setEditingId(entry.id);
    setEditDefinitionDraft(entry.definition || '');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = updateVocabularyDefinition(editingId, editDefinitionDraft);
    onVocabChange(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDefinitionDraft('');
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = vocabList.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(e.word)}</strong></td>
        <td>${escapeHtml(statusLabel(e.status))}</td>
        <td>${new Date(e.addedAt).toLocaleDateString('cs-CZ')}</td>
        <td>${escapeHtml(e.definition || '')}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Aria — Slovníček</title>
<style>
  body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111}
  h1{color:#10b981;margin-bottom:4px}p.sub{color:#666;font-size:0.85em;margin:0 0 20px}
  table{width:100%;border-collapse:collapse}
  th{background:#f3f4f6;padding:8px 12px;text-align:left;border:1px solid #e5e7eb;font-size:.85em;text-transform:uppercase;letter-spacing:.05em}
  td{padding:8px 12px;border:1px solid #e5e7eb;vertical-align:top}
  tr:nth-child(even){background:#fafafa}
</style></head><body>
<h1>📚 Aria — Slovníček</h1>
<p class="sub">Export: ${new Date().toLocaleDateString('cs-CZ')} · ${vocabList.length} slov</p>
<table><thead><tr><th>#</th><th>Slovo</th><th>Stav</th><th>Přidáno</th><th>Poznámka</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`);
    win.document.close();
    win.print();
  };

  // ─── Search filter helpers ────────────────────────────────────────

  const handleAddFromEmptySearch = async () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    setNewWord(trimmed);
    setSearch('');
    setTimeout(() => {
      newWordInputRef.current?.focus();
    }, 50);
  };

  // ─── Recall mode ──────────────────────────────────────────────────

  const handleStartRecall = () => {
    const q = buildRecallQueue(vocabList, includeMastered);
    if (q.length === 0) return;
    setQueue(q);
    setQueueIdx(0);
    setFlipped(false);
    setSessionResult({ total: q.length, correct: 0, incorrect: 0, skipped: 0 });
    setView('recall');
  };

  const advanceQueue = (result: 'correct' | 'incorrect' | 'skip') => {
    const current = queue[queueIdx];
    if (!current) return;
    if (result !== 'skip') {
      const updated = recordRecallResult(current.id, result);
      onVocabChange(updated);
    }
    setSessionResult(prev => ({
      ...prev,
      correct: prev.correct + (result === 'correct' ? 1 : 0),
      incorrect: prev.incorrect + (result === 'incorrect' ? 1 : 0),
      skipped: prev.skipped + (result === 'skip' ? 1 : 0),
    }));
    setFlipped(false);
    if (result === 'incorrect') {
      // posuň aktuální slovo na konec fronty + jdi na další
      setQueue(prev => {
        const rest = [...prev.slice(0, queueIdx), ...prev.slice(queueIdx + 1), current];
        return rest;
      });
      // queueIdx zůstává — další slovo zaujme pozici
    } else {
      if (queueIdx + 1 >= queue.length) {
        setView('recall-summary');
      } else {
        setQueueIdx(prev => prev + 1);
      }
    }
  };

  const handleRestartRecall = () => {
    handleStartRecall();
  };

  // ─── Render: Recall summary ───────────────────────────────────────

  if (view === 'recall-summary') {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-x-4 top-16 bottom-16 z-[201] max-w-xl mx-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <h2 className="text-white font-black text-base">🎯 Hotovo!</h2>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition" aria-label="Zavřít">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
            <div className="text-center">
              <p className="text-5xl mb-3">{sessionResult.correct >= sessionResult.incorrect ? '🎉' : '💪'}</p>
              <p className="text-white font-black text-lg">Procvičeno {sessionResult.total} slov</p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-3 py-3 text-center">
                <p className="text-emerald-300 font-black text-2xl">{sessionResult.correct}</p>
                <p className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-wider mt-1">Věděl</p>
              </div>
              <div className="bg-amber-500/15 border border-amber-400/30 rounded-xl px-3 py-3 text-center">
                <p className="text-amber-300 font-black text-2xl">{sessionResult.skipped}</p>
                <p className="text-amber-400/70 text-[10px] font-bold uppercase tracking-wider mt-1">Tak nějak</p>
              </div>
              <div className="bg-red-500/15 border border-red-400/30 rounded-xl px-3 py-3 text-center">
                <p className="text-red-300 font-black text-2xl">{sessionResult.incorrect}</p>
                <p className="text-red-400/70 text-[10px] font-bold uppercase tracking-wider mt-1">Nevěděl</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-white/10 shrink-0 flex gap-2">
            <button
              onClick={handleRestartRecall}
              className="flex-1 px-4 py-2.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition active:scale-95"
            >
              🔁 Znovu
            </button>
            <button
              onClick={() => setView('list')}
              className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-400 transition active:scale-95"
            >
              ✓ Hotovo
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Render: Recall view ──────────────────────────────────────────

  if (view === 'recall') {
    const current = queue[queueIdx];
    if (!current) {
      // Safety: prázdná fronta → vrátíme se do listu (setState v useEffect, ne během renderu)
      return (
        <RecallEmptyGuard onEmpty={() => setView('list')} />
      );
    }
    const c = statusColors(current.status);
    // P1-8: pro Mix se směr odvozuje deterministicky z indexu (stabilní mezi flipy).
    const cardDir: RecallDirection = recallDirection === 'mix'
      ? (queueIdx % 2 === 0 ? 'en-cz' : 'cz-en')
      : recallDirection;
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-x-4 top-16 bottom-16 z-[201] max-w-xl mx-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <button
              onClick={() => setView('list')}
              className="text-slate-400 hover:text-white text-sm font-semibold transition"
              aria-label="Zpět na seznam"
            >
              ← Seznam
            </button>
            <div className="text-center">
              <p className="text-white font-black text-sm">🎯 Procvičování</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{queueIdx + 1} / {queue.length}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition" aria-label="Zavřít">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-white/5 shrink-0">
            <div
              className="h-full bg-blue-400 transition-all duration-300"
              style={{ width: `${((queueIdx) / Math.max(queue.length, 1)) * 100}%` }}
            />
          </div>

          {/* Flashcard */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
            {/* P1-8: přepínač směru — EN→CZ (poznávání) / CZ→EN (produkce) / Mix */}
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 text-[10px] font-black">
              {(['en-cz', 'cz-en', 'mix'] as RecallDirection[]).map(dir => (
                <button
                  key={dir}
                  onClick={() => { setRecallDirection(dir); setFlipped(false); }}
                  className={`px-3 py-1 rounded-full transition ${recallDirection === dir ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {dir === 'en-cz' ? 'EN→CZ' : dir === 'cz-en' ? 'CZ→EN' : 'Mix'}
                </button>
              ))}
            </div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${c.badgeBg} ${c.badgeText}`}>
              {statusLabel(current.status)}
            </span>
            <button
              onClick={() => setFlipped(f => !f)}
              className="w-full max-w-sm min-h-[180px] bg-gradient-to-br from-slate-800 to-slate-700 border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center justify-center px-6 py-8 hover:from-slate-700 hover:to-slate-600 active:scale-[0.99] transition"
              aria-label={flipped ? 'Skrýt' : 'Odhalit'}
            >
              {cardDir === 'cz-en' ? (
                /* CZ→EN produkční směr: ukáže překlad, žák vybaví anglické slovo */
                <>
                  <p className="text-emerald-300 font-black text-2xl text-center leading-tight">
                    {current.definition || <span className="italic text-slate-500 text-base">(bez překladu — klepni)</span>}
                  </p>
                  {flipped ? (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-black text-3xl text-center">{current.word}</p>
                        {onSpeak && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); onSpeak(current.word); }}
                            className="text-2xl hover:scale-110 transition cursor-pointer"
                            aria-label="Přehrát výslovnost"
                          >🔊</span>
                        )}
                      </div>
                      {current.contextSentence && (
                        <p className="text-slate-400 text-sm italic text-center">„{current.contextSentence}"</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs mt-4 italic">Klepni pro anglické slovo</p>
                  )}
                </>
              ) : (
                /* EN→CZ poznávací směr (výchozí) */
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-black text-3xl text-center leading-tight">{current.word}</p>
                    {onSpeak && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onSpeak(current.word); }}
                        className="text-xl hover:scale-110 transition cursor-pointer"
                        aria-label="Přehrát výslovnost"
                      >🔊</span>
                    )}
                  </div>
                  {flipped ? (
                    <p className="text-emerald-300 text-base font-semibold mt-4 text-center">
                      {current.definition || <span className="italic text-slate-500">(bez překladu)</span>}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-xs mt-4 italic">Klepni pro odhalení</p>
                  )}
                </>
              )}
            </button>
            {current.correctCount + current.incorrectCount > 0 && (
              <p className="text-[10px] text-slate-600">
                Statistika: ✅ {current.correctCount} · ❌ {current.incorrectCount}
              </p>
            )}
          </div>

          {/* Recall buttons */}
          <div className="px-4 py-4 border-t border-white/10 shrink-0">
            {flipped ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => advanceQueue('incorrect')}
                  className="flex flex-col items-center gap-1 px-2 py-3 bg-red-500/20 text-red-300 border border-red-400/30 rounded-xl text-xs font-bold hover:bg-red-500/30 transition active:scale-95"
                >
                  <span className="text-xl">😐</span>
                  Nevěděl
                </button>
                <button
                  onClick={() => advanceQueue('skip')}
                  className="flex flex-col items-center gap-1 px-2 py-3 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition active:scale-95"
                >
                  <span className="text-xl">🙂</span>
                  Tak nějak
                </button>
                <button
                  onClick={() => advanceQueue('correct')}
                  className="flex flex-col items-center gap-1 px-2 py-3 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition active:scale-95"
                >
                  <span className="text-xl">😄</span>
                  Vím
                </button>
              </div>
            ) : (
              <button
                onClick={() => setFlipped(true)}
                className="w-full px-4 py-3 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-400 transition active:scale-95"
              >
                Odhalit překlad
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Render: List view (default) ──────────────────────────────────

  const canStartRecall = buildRecallQueue(vocabList, includeMastered).length > 0;
  const recallQueueSize = buildRecallQueue(vocabList, includeMastered).length;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-16 bottom-16 z-[201] max-w-xl mx-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white font-black text-base">📚 Slovníček</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {vocabList.length} {vocabList.length === 1 ? 'slovo' : vocabList.length < 5 ? 'slova' : 'slov'}
              {vocabList.length > 0 && (
                <span className="text-slate-600"> · 🔵 {counts.new} · 🟠 {counts.learning} · 🟢 {counts.mastered}</span>
              )}
              {dueForRefreshCount > 0 && (
                <span className="ml-1.5 text-amber-300 font-semibold">· ↻ {dueForRefreshCount} k zopáknutí</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canStartRecall && (
              <button
                onClick={handleStartRecall}
                className="relative px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-400 transition active:scale-95"
                aria-label="Spustit procvičování"
              >
                🎯 Procvičit
                {dueForRefreshCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-black px-1 border-2 border-slate-900">
                    ↻
                  </span>
                )}
              </button>
            )}
            {vocabList.length > 0 && (
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg text-xs font-bold hover:bg-blue-500/30 transition active:scale-95"
              >
                🖨
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition" aria-label="Zavřít">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search + Hide-mastered toggle */}
        {vocabList.length > 0 && (
          <div className="px-5 py-2 border-b border-white/10 shrink-0 space-y-2">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Hledat slovo nebo překlad..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-9 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-400/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition"
                  aria-label="Smazat hledání"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>
            {counts.mastered > 0 && (
              <button
                type="button"
                role="switch"
                aria-checked={!hideMastered}
                onClick={() => setHideMastered(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-1 py-0.5 group"
              >
                <span className="text-[11px] text-slate-400 font-semibold">
                  {hideMastered
                    ? `Skrytá zvládnutá: ${counts.mastered}`
                    : `Zobrazena všechna slova (${counts.mastered} zvládnutých)`}
                </span>
                <span className={`w-8 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${hideMastered ? 'bg-emerald-500/60' : 'bg-slate-600'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${hideMastered ? 'translate-x-3' : 'translate-x-0'}`} />
                </span>
              </button>
            )}
          </div>
        )}

        {/* Add word */}
        <div className="px-5 py-3 border-b border-white/10 shrink-0">
          <div className="flex gap-2">
            <input
              ref={newWordInputRef}
              type="text"
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="+ Přidat slovo (Aria přeloží)..."
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
          <div className="mt-2 flex items-center gap-3">
            {!showCustomMeaning && (
              <button
                onClick={() => setShowCustomMeaning(true)}
                className="text-[10px] font-bold text-blue-400/70 hover:text-blue-300 transition uppercase tracking-wider"
              >
                + vlastní význam
              </button>
            )}
            {!showBulk && (
              <button
                onClick={() => setShowBulk(true)}
                className="text-[10px] font-bold text-blue-400/70 hover:text-blue-300 transition uppercase tracking-wider"
              >
                ⌷ vložit více
              </button>
            )}
          </div>
          {showCustomMeaning && (
            <div className="mt-2">
              <textarea
                value={customMeaning}
                onChange={e => setCustomMeaning(e.target.value)}
                placeholder="Vlastní význam (nepřekládat automaticky)..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-400/50 resize-none"
              />
              <button
                onClick={() => { setShowCustomMeaning(false); setCustomMeaning(''); }}
                className="mt-1 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition"
              >
                Zrušit vlastní význam
              </button>
            </div>
          )}
          {showBulk && (
            <div className="mt-2">
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder="Vlož více slov (čárky, středníky nebo nové řádky)... např. apple, run, decide"
                rows={3}
                disabled={bulkBusy}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-400/50 resize-none disabled:opacity-50"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={handleBulkAdd}
                  disabled={!bulkText.trim() || bulkBusy}
                  className="px-3 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-lg hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
                >
                  {bulkBusy ? '⏳ Překládám...' : '✓ Přidat všechna + přeložit'}
                </button>
                <button
                  onClick={() => { setShowBulk(false); setBulkText(''); }}
                  disabled={bulkBusy}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition disabled:opacity-50"
                >
                  Zrušit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Word list */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
          {vocabList.length === 0 && (
            <div className="text-center mt-8 text-slate-500">
              <p className="text-4xl mb-3">📖</p>
              <p className="text-sm font-semibold">Slovníček je prázdný</p>
              <p className="text-xs mt-1">Řekni Arii: „I don't know the word X"<br/>nebo napiš slovo výše — Aria přeloží</p>
            </div>
          )}

          {vocabList.length > 0 && filtered.length === 0 && (
            <div className="text-center mt-8 text-slate-500">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-sm font-semibold">Žádné slovo neodpovídá „{search}"</p>
              <button
                onClick={handleAddFromEmptySearch}
                className="mt-3 px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-xl text-xs font-bold hover:bg-blue-500/30 transition active:scale-95"
              >
                + Přidat „{search}"
              </button>
            </div>
          )}

          {filtered.map((entry, idx) => {
            const c = statusColors(entry.status);
            const isEditing = editingId === entry.id;
            const isPending = pendingTranslateIds.has(entry.id);
            const isRefreshDue = entry.status === 'mastered' && (!entry.lastReviewedAt || Date.now() - entry.lastReviewedAt >= 7 * 24 * 60 * 60 * 1000);
            return (
              <div
                key={entry.id}
                className="relative flex items-stretch gap-0 bg-white/5 rounded-xl overflow-hidden group hover:bg-white/8 transition"
              >
                {/* Color status bar */}
                <div className={`w-1 shrink-0 ${c.bar}`} />

                <div className="flex-1 min-w-0 px-3 py-3">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-600 text-xs font-bold mt-0.5 w-5 shrink-0">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => !isEditing && handleStartEdit(entry)}
                          className="text-white font-bold text-sm hover:text-blue-300 transition text-left"
                          disabled={isEditing}
                        >
                          {entry.word}
                        </button>
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${c.badgeBg} ${c.badgeText}`}>
                          {statusLabel(entry.status)}
                        </span>
                        {isRefreshDue && (
                          <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300" title="Připomenout">
                            ↻ k zopáknutí
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-1.5">
                          <textarea
                            value={editDefinitionDraft}
                            onChange={e => setEditDefinitionDraft(e.target.value)}
                            rows={2}
                            autoFocus
                            placeholder="Český význam..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-400/50 resize-none"
                          />
                          <div className="flex gap-1.5 mt-1.5">
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-400 transition active:scale-95"
                            >
                              ✓ Uložit
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-white/10 text-slate-300 text-[10px] font-bold rounded-lg hover:bg-white/20 transition active:scale-95"
                            >
                              Zrušit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isPending && !entry.definition ? (
                            <p className="text-slate-500 text-xs mt-0.5 italic flex items-center gap-1.5">
                              <span className="inline-block w-3 h-3 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
                              Aria překládá...
                            </p>
                          ) : entry.definition ? (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(entry)}
                              className="text-slate-400 text-xs mt-0.5 leading-relaxed text-left hover:text-slate-200 transition w-full"
                              title="Klepni pro úpravu"
                            >
                              {entry.definition}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(entry)}
                              className="text-slate-600 text-xs mt-0.5 italic hover:text-slate-400 transition"
                            >
                              + přidat význam
                            </button>
                          )}
                          <p className="text-slate-600 text-[10px] mt-0.5">
                            {new Date(entry.addedAt).toLocaleDateString('cs-CZ')}
                            {(entry.correctCount > 0 || entry.incorrectCount > 0) && (
                              <span className="ml-2">✅ {entry.correctCount} · ❌ {entry.incorrectCount}</span>
                            )}
                          </p>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="p-1.5 text-slate-700 hover:text-red-400 transition shrink-0 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Smazat"
                        aria-label="Smazat slovo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {vocabList.length > 0 && (
          <div className="px-5 py-2.5 border-t border-white/10 shrink-0 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[10px] text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMastered}
                onChange={e => setIncludeMastered(e.target.checked)}
                className="accent-emerald-400"
              />
              I všechna zvládnutá ({recallQueueSize} ve frontě)
            </label>
            <button
              onClick={handleClearAll}
              className="text-[10px] text-red-400/60 hover:text-red-400 transition font-bold uppercase tracking-wider"
            >
              Smazat vše
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default VocabularyModal;
