import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  // Function to format the text, specifically handling "💡 Correction" and "🇨🇿 Translation"
  const renderText = (text: string) => {
    if (isUser) return <p className="text-sm sm:text-base">{text}</p>;

    // First split by correction
    const partsCorrection = text.split("💡 Correction");
    const mainContentWithTranslation = partsCorrection[0];
    const correction = partsCorrection.length > 1 ? partsCorrection[1] : null;

    // Then split main content by translation if present
    const partsTranslation = mainContentWithTranslation.split("🇨🇿 Translation:");
    const englishText = partsTranslation[0];
    const translation = partsTranslation.length > 1 ? partsTranslation[1] : null;

    return (
      <div className="flex flex-col gap-2">
        <div className="whitespace-pre-wrap text-sm sm:text-base">{englishText.trim()}</div>
        
        {translation && (
           <div className="mt-1 pt-2 border-t border-gray-100 text-emerald-600 text-xs sm:text-sm italic">
             <span className="font-semibold not-italic mr-1">🇨🇿</span>
             {translation.trim()}
           </div>
        )}

        {correction && (
          <div className="mt-2 pt-2 border-t border-emerald-200/50 text-emerald-800 text-xs sm:text-sm bg-emerald-50 p-2 rounded">
            <span className="font-bold flex items-center gap-1">
              💡 Correction:
            </span>
            <span className="whitespace-pre-wrap">{correction.trim()}</span>
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
