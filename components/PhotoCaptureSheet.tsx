import React, { useEffect, useRef, useState } from 'react';
import { extractReadingText } from '../services/geminiService';

interface PhotoCaptureSheetProps {
  open: boolean;
  onClose: () => void;
  onTextExtracted: (text: string) => void;
}

const PhotoCaptureSheet: React.FC<PhotoCaptureSheetProps> = ({ open, onClose, onTextExtracted }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL on unmount or when preview changes — prevents memory leak
  // even if parent closes the modal without a button tap (ISC-42).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUse = async () => {
    if (!file || isExtracting) return;
    setIsExtracting(true);
    setError(null);
    try {
      const text = await extractReadingText(file);
      onTextExtracted(text);
      reset();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Něco se pokazilo.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRetake = () => {
    reset();
    fileInputRef.current?.click();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg max-w-md w-full p-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-white">Vyfotit stránku</h2>

        {!previewUrl && (
          <>
            <p className="text-sm text-slate-300">
              Vyfoť stránku knihy nebo článku. ARIA pak bude vědět přesný text a opraví jen
              skutečné chyby ve výslovnosti.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="text-sm text-slate-300"
            />
          </>
        )}

        {previewUrl && (
          <>
            <img src={previewUrl} alt="náhled stránky" className="max-h-64 object-contain rounded" />
            {isExtracting && <div className="text-sm text-blue-300">⏳ Čtu text ze stránky…</div>}
            {error && <div className="text-sm text-red-400">⚠️ {error}</div>}
          </>
        )}

        <div className="flex gap-2 justify-end mt-2">
          {previewUrl && !isExtracting && (
            <>
              <button
                onClick={handleRetake}
                className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
              >
                Znovu
              </button>
              <button
                onClick={handleUse}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
              >
                Použít
              </button>
            </>
          )}
          <button
            onClick={handleClose}
            disabled={isExtracting}
            className="px-3 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zrušit
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCaptureSheet;
