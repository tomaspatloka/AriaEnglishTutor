import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  onRetryCorrected?: (message: Message) => void;
  onPracticeVariants?: (message: Message) => void;
}

const parseModelText = (text: string) => {
  const correctionMatch = text.match(/Correction\s*:/i);
  const mainWithTranslation = correctionMatch && typeof correctionMatch.index === 'number'
    ? text.substring(0, correctionMatch.index)
    : text;
  const correction = correctionMatch && typeof correctionMatch.index === 'number'
    ? text.substring(correctionMatch.index + correctionMatch[0].length).trim()
    : null;

  const translationMatch = mainWithTranslation.match(/(Translation|Překlad)\s*:/i);
  const englishText = translationMatch && typeof translationMatch.index === 'number'
    ? mainWithTranslation.substring(0, translationMatch.index).trim()
    : mainWithTranslation.trim();
  const translation = translationMatch && typeof translationMatch.index === 'number'
    ? mainWithTranslation.substring(translationMatch.index + translationMatch[0].length).trim()
    : null;

  return {
    englishText,
    translation,
    correction,
  };
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetryCorrected, onPracticeVariants }) => {
  const isUser = message.role === 'user';

  const renderText = (text: string) => {
    if (isUser) return <p className="text-sm sm:text-base whitespace-pre-wrap">{text}</p>;

    const { englishText, translation, correction } = parseModelText(text);

    return (
      <div className="flex flex-col gap-2">
        <div className="whitespace-pre-wrap text-sm sm:text-base">{englishText}</div>

        {translation && (
          <div className="mt-1 pt-2 border-t border-gray-100 text-emerald-700 text-xs sm:text-sm italic">
            {translation}
          </div>
        )}

        {correction && (
          <div className="mt-2 pt-2 border-t border-emerald-200/50 text-emerald-800 text-xs sm:text-sm bg-emerald-50 p-2 rounded space-y-2">
            <span className="font-bold flex items-center gap-1">Correction:</span>
            <span className="whitespace-pre-wrap">{correction}</span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetryCorrected?.(message);
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-700 font-semibold text-[11px] hover:bg-emerald-100 transition"
              >
                Zopakovat spravne
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPracticeVariants?.(message);
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-700 font-semibold text-[11px] hover:bg-emerald-100 transition"
              >
                Procvicit 3 varianty
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-primary text-white rounded-tr-none'
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
        }`}
      >
        {renderText(message.text)}
        <div
          className={`text-[10px] mt-1 text-right w-full opacity-70 ${
            isUser ? 'text-emerald-100' : 'text-gray-400'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
