import React, { useEffect, useState } from 'react';

interface VirtualAvatarProps {
  gender: 'MALE' | 'FEMALE';
  isSpeaking: boolean;
  isListening: boolean;
}

const VirtualAvatar: React.FC<VirtualAvatarProps> = ({ gender, isSpeaking, isListening }) => {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [blink, setBlink] = useState(false);

  // Blinking logic
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 4000); // Blink every 4 seconds
    return () => clearInterval(blinkInterval);
  }, []);

  // Speaking mouth movement logic
  useEffect(() => {
    let animationFrame: number;
    const animateMouth = () => {
      if (isSpeaking) {
        // Random aperture logic to simulate talking
        const openAmount = 3 + Math.random() * 12;
        setMouthOpen(openAmount);
        // Vary speed slightly
        animationFrame = requestAnimationFrame(() => setTimeout(animateMouth, 100));
      } else {
        setMouthOpen(0);
      }
    };

    if (isSpeaking) {
      animateMouth();
    } else {
      setMouthOpen(0);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isSpeaking]);

  // Colors
  const skinColor = "#f0d5be";
  const eyeColor = "#3e2723";
  // Female = Dark Brown, Male = Black/Dark Brown
  const hairColor = gender === 'FEMALE' ? "#4e342e" : "#212121"; 
  const shirtColor = gender === 'FEMALE' ? "#ec407a" : "#1976d2";
  const bgColor = isListening ? "#e0f2f1" : "#f5f5f5";

  return (
    <div className={`relative w-full h-full rounded-full overflow-hidden bg-white shadow-inner transition-colors duration-500`} style={{ backgroundColor: bgColor }}>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        
        {/* Hair Back (Female) */}
        {gender === 'FEMALE' && (
           <path d="M 40 60 Q 100 -10 160 60 L 170 180 Q 100 210 30 180 Z" fill={hairColor} />
        )}

        {/* Neck */}
        <rect x="80" y="130" width="40" height="50" fill={skinColor} opacity="0.9"/>
        
        {/* Shoulders / Shirt */}
        <path 
          d="M 20 200 Q 100 160 180 200 V 200 H 20 Z" 
          fill={shirtColor} 
        />

        {/* Face Shape */}
        <ellipse cx="100" cy="100" rx={gender === 'MALE' ? 48 : 46} ry="58" fill={skinColor} />

        {/* Ears */}
        <ellipse cx="52" cy="105" rx="5" ry="10" fill={skinColor} />
        <ellipse cx="148" cy="105" rx="5" ry="10" fill={skinColor} />

        {/* Hair Front */}
        {gender === 'MALE' ? (
           // Short hair
           <path d="M 52 85 Q 100 20 148 85 Q 148 60 100 45 Q 52 60 52 85" fill={hairColor} />
        ) : (
           // Female bangs/style
           <path d="M 54 80 Q 100 30 146 80 Q 130 50 100 50 Q 70 50 54 80" fill={hairColor} />
        )}

        {/* Eyes Group (for blinking) */}
        <g style={{ transformOrigin: '100px 95px', transform: `scaleY(${blink ? 0.1 : 1})`, transition: 'transform 0.1s' }}>
           {/* Whites */}
           <ellipse cx="78" cy="95" rx="8" ry="5" fill="white" />
           <ellipse cx="122" cy="95" rx="8" ry="5" fill="white" />
           {/* Pupils */}
           <circle cx="78" cy="95" r="3" fill={eyeColor} />
           <circle cx="122" cy="95" r="3" fill={eyeColor} />
           
           {/* Brows */}
           <path d="M 70 85 Q 78 82 86 85" stroke={hairColor} strokeWidth="2" fill="none" opacity="0.8" />
           <path d="M 114 85 Q 122 82 130 85" stroke={hairColor} strokeWidth="2" fill="none" opacity="0.8" />
           
           {/* Lashes (Female) */}
           {gender === 'FEMALE' && (
             <>
               <path d="M 68 92 L 65 90" stroke="black" strokeWidth="0.5" />
               <path d="M 132 92 L 135 90" stroke="black" strokeWidth="0.5" />
             </>
           )}
        </g>

        {/* Nose */}
        <path d="M 100 105 L 96 120 L 104 120 Z" fill="#d7ccc8" opacity="0.8" />

        {/* Mouth */}
        {/* Dynamic mouth opening */}
        <ellipse 
          cx="100" 
          cy="140" 
          rx={12 + (mouthOpen / 6)} 
          ry={3 + (mouthOpen / 2.5)} 
          fill={isSpeaking ? "#a95858" : "#bf8a8a"} 
        />
        
        {/* Glasses hint (optional style, maybe add later) */}

      </svg>
    </div>
  );
};

export default VirtualAvatar;
