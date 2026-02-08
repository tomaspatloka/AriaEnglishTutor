import React, { useRef, useEffect } from 'react';

interface InputAreaProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  isListening: boolean;
  toggleListening: () => void;
  isLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({
  inputText,
  setInputText,
  onSend,
  isListening,
  toggleListening,
  isLoading
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-2 sm:p-4 z-50 safe-area-pb">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-primary focus-within:bg-white transition-colors">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Message Aria..."}
            className="w-full bg-transparent border-none outline-none resize-none text-base max-h-24 py-1"
            rows={1}
            disabled={isLoading || isListening}
          />
        </div>

        {inputText.trim() ? (
          <button
            onClick={onSend}
            disabled={isLoading}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {isLoading ? (
               <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 transform rotate-[-45deg] translate-x-0.5 -translate-y-0.5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        ) : (
          <button
            onClick={toggleListening}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-secondary text-white hover:bg-emerald-500'
            }`}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default InputArea;
