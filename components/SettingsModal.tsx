import React, { useState, useRef } from 'react';
import { AppSettings, EnglishLevel, AvatarType } from '../types';
import { PRESET_AVATARS, APP_VERSION } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const levels: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const getStrictnessLabel = (val: number) => {
    if (val <= 3) return "Chill (Focus on Flow)";
    if (val <= 7) return "Balanced (Standard)";
    return "Strict Teacher (Detailed)";
  };

  const handleAvatarSelect = (type: AvatarType) => {
    let gender = settings.voiceGender;
    let newSettings = { ...settings, avatarType: type };

    // Automatické nastavení pohlaví hlasu podle výběru učitele
    if (type === 'preset-female') {
      gender = 'FEMALE';
    } else if (type === 'preset-male') {
      gender = 'MALE';
    }

    setSettings({ ...newSettings, voiceGender: gender, showAvatarMode: true });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setSettings({
      ...settings,
      avatarType: 'custom',
      customAvatarImageUrl: objectUrl,
      showAvatarMode: true
    });
  };

  const handleForceUpdate = () => {
    if (confirm("Vynutit aktualizaci? Aplikace se znovu načte a stáhne nejnovější verzi z Cloudflare.\n\nForce update? App will reload and download the latest version.")) {
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (let name of names) caches.delete(name);
        });
      }
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">

        <div className="p-4 flex items-center justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
          <h2 className="text-xl font-black text-gray-900 ml-2">Settings / Nastavení</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 no-scrollbar pb-24">

          {/* Interaction Mode Selection (New) */}
          <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-5 border border-indigo-100">
            <label className="block text-sm font-black text-indigo-900 mb-3 block">Conversation Mode / Režim</label>
            <div className="flex bg-white rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => setSettings({ ...settings, interactionMode: 'live-api' })}
                className={`flex-1 py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black transition-all uppercase tracking-wide flex flex-col items-center gap-1 ${settings.interactionMode === 'live-api' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-400 hover:text-indigo-400'}`}
              >
                <span>⚡ Gemini Live</span>
                <span className="opacity-70 normal-case font-normal scale-90">Real-time Audio</span>
              </button>
              <button
                onClick={() => setSettings({ ...settings, interactionMode: 'legacy' })}
                className={`flex-1 py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black transition-all uppercase tracking-wide flex flex-col items-center gap-1 ${settings.interactionMode === 'legacy' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-400 hover:text-indigo-400'}`}
              >
                <span>📝 Standard</span>
                <span className="opacity-70 normal-case font-normal scale-90">Speech-to-Text</span>
              </button>
            </div>
            <p className="text-[10px] text-indigo-400 mt-2 text-center px-2">
              {settings.interactionMode === 'live-api'
                ? "🚀 Gemini 2.5 Flash Native Audio: Okamžitá reakce, skákání do řeči, přirozenější hlas."
                : "🐢 Legacy Mode: Starší způsob (Nahrát -> Přepsat -> Odeslat -> Přečíst). Pomalejší, ale stabilní."}
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Teacher Selection */}
          <section>
            <label className="block text-sm font-black text-gray-800 mb-4 text-center uppercase tracking-wider">Choose Your Teacher / Vyberte si učitele</label>
            <div className="grid grid-cols-3 gap-3">
              {/* 1. Sarah (Female) */}
              <button
                onClick={() => handleAvatarSelect('preset-female')}
                className={`group relative rounded-2xl overflow-hidden aspect-square border-4 transition-all duration-300 ${settings.avatarType === 'preset-female' ? 'border-emerald-500 scale-105 shadow-lg ring-4 ring-emerald-100' : 'border-gray-50 opacity-70 hover:opacity-100'}`}
              >
                <img src={PRESET_AVATARS.female.imageUrl} className="w-full h-full object-cover" alt="Sarah" crossOrigin="anonymous" />
                <div className={`absolute bottom-0 w-full py-1 text-center font-black text-[10px] uppercase tracking-widest transition-colors ${settings.avatarType === 'preset-female' ? 'bg-emerald-500 text-white' : 'bg-gray-800/60 text-white'}`}>Sarah</div>
              </button>

              {/* 2. Tom (Male) */}
              <button
                onClick={() => handleAvatarSelect('preset-male')}
                className={`group relative rounded-2xl overflow-hidden aspect-square border-4 transition-all duration-300 ${settings.avatarType === 'preset-male' ? 'border-emerald-500 scale-105 shadow-lg ring-4 ring-emerald-100' : 'border-gray-50 opacity-70 hover:opacity-100'}`}
              >
                <img src={PRESET_AVATARS.male.imageUrl} className="w-full h-full object-cover" alt="Tom" crossOrigin="anonymous" />
                <div className={`absolute bottom-0 w-full py-1 text-center font-black text-[10px] uppercase tracking-widest transition-colors ${settings.avatarType === 'preset-male' ? 'bg-emerald-500 text-white' : 'bg-gray-800/60 text-white'}`}>Tom</div>
              </button>

              {/* 3. Virtual (Aria) */}
              <button
                onClick={() => handleAvatarSelect('virtual')}
                className={`group relative rounded-2xl overflow-hidden aspect-square border-4 transition-all duration-300 flex flex-col items-center justify-center bg-gray-50 ${settings.avatarType === 'virtual' ? 'border-emerald-500 scale-105 shadow-lg ring-4 ring-emerald-100' : 'border-gray-50 opacity-70'}`}
              >
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-400">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className={`absolute bottom-0 w-full py-1 text-center font-black text-[10px] uppercase tracking-widest transition-colors ${settings.avatarType === 'virtual' ? 'bg-emerald-500 text-white' : 'bg-gray-800/60 text-white'}`}>Aria</div>
              </button>
            </div>

            <div className="mt-4">
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-[10px] font-black hover:bg-gray-50 flex items-center justify-center gap-2 transition-all tracking-widest uppercase ${settings.avatarType === 'custom' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload Own Photo
              </button>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section>
            <label className="block text-sm font-black text-gray-800 mb-3">Display Mode / Zobrazení</label>
            <div className="bg-gray-100 p-1.5 rounded-2xl flex">
              <button
                onClick={() => setSettings({ ...settings, showAvatarMode: false })}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${!settings.showAvatarMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
              >
                CHAT
              </button>
              <button
                onClick={() => setSettings({ ...settings, showAvatarMode: true })}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${settings.showAvatarMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
              >
                AVATAR
              </button>
            </div>
          </section>

          <section className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-900 text-sm font-black block">English Transcript</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Anglický text</span>
              </div>
              <button
                onClick={() => setSettings({ ...settings, showEnglishTranscript: !settings.showEnglishTranscript })}
                className={`w-12 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out ${settings.showEnglishTranscript ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${settings.showEnglishTranscript ? 'translate-x-5' : ''}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-900 text-sm font-black block">Czech Translation</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Český překlad</span>
              </div>
              <button
                onClick={() => setSettings({ ...settings, showCzechTranslation: !settings.showCzechTranslation })}
                className={`w-12 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out ${settings.showCzechTranslation ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${settings.showCzechTranslation ? 'translate-x-5' : ''}`}></div>
              </button>
            </div>
          </section>

          <section>
            <label className="block text-sm font-black text-gray-800 mb-3 px-1">English Level / Úroveň</label>
            <div className="grid grid-cols-3 gap-2">
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSettings({ ...settings, level: lvl })}
                  className={`py-3 rounded-xl text-[10px] font-black transition-all tracking-wider ${settings.level === lvl
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end mb-3 px-1">
              <label className="block text-sm font-black text-gray-800 uppercase tracking-wider">
                Strictness / Přísnost
              </label>
              <span className="text-emerald-600 font-black text-2xl leading-none">{settings.correctionStrictness}</span>
            </div>
            <input
              type="range" min="1" max="10" step="1"
              value={settings.correctionStrictness}
              onChange={(e) => setSettings({ ...settings, correctionStrictness: parseInt(e.target.value) })}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between mt-2 px-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chill</span>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{getStrictnessLabel(settings.correctionStrictness)}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Strict</span>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-gray-900 text-sm font-black block">App Version / Verze</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{APP_VERSION}</span>
              </div>
              <button
                onClick={handleForceUpdate}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-50 transition active:scale-95 shadow-sm"
              >
                Force Update
              </button>
            </div>
            <p className="text-[10px] text-gray-400 italic">
              Pokud aplikace nefunguje správně, použijte toto tlačítko k vynucení stažení nejnovějších souborů (Hard Refresh).
            </p>
          </section>
        </div>

        <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0">
          <button
            onClick={handleSave}
            className="w-full bg-emerald-500 text-white font-black py-4 rounded-[1.5rem] shadow-xl hover:bg-emerald-600 active:scale-95 transition-all uppercase tracking-widest text-sm"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;