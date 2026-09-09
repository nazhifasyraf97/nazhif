import React from 'react';
import { Volume2, VolumeX, Eye, Type } from 'lucide-react';
import { TextSize } from '../types';
import { seniorAudio } from '../utils/audioPlayer';

interface HeaderProps {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  isSpeaking: boolean;
  onStopAudio: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  textSize,
  setTextSize,
  highContrast,
  setHighContrast,
  isSpeaking,
  onStopAudio,
}) => {
  return (
    <header
      id="app-header"
      className={`border-b transition-colors ${
        highContrast
          ? 'bg-black text-white border-yellow-400'
          : 'bg-white text-slate-900 border-slate-200'
      } py-4 px-4 sm:px-6 sticky top-0 z-30 shadow-xs`}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Jenama & Fungsi Aplikasi */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div
            className={`w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 transition-transform hover:scale-105 ${
              highContrast ? 'border-yellow-400 bg-yellow-400/20' : 'border-blue-200/80 bg-blue-600'
            }`}
          >
            <img
              src="/app-icon.png"
              alt="Easy Label Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <h1
                id="app-title"
                className={`font-extrabold tracking-tight ${
                  textSize === 'extralarge'
                    ? 'text-3xl'
                    : textSize === 'large'
                    ? 'text-2xl'
                    : 'text-xl'
                } ${highContrast ? 'text-yellow-300' : 'text-slate-900'}`}
              >
                Easy Label
              </h1>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  highContrast
                    ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400'
                    : 'bg-teal-50 text-teal-700 border-teal-200'
                }`}
              >
                Audio Ubat Warga Emas
              </span>
            </div>
            <p
              id="app-credit"
              className={`text-xs sm:text-sm font-medium ${
                highContrast ? 'text-gray-300' : 'text-slate-600'
              }`}
            >
              Established 2026 by <strong className={highContrast ? 'text-white' : 'text-slate-800'}>Inovasi Farmasi PKD Tanah Merah</strong>
            </p>
          </div>
        </div>

        {/* Bar Alat Kebolehcapaian (Accessibility) */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Butang Hentikan Suara Pantas */}
          {isSpeaking && (
            <button
              id="stop-audio-header-button"
              onClick={onStopAudio}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold animate-pulse transition-all ${
                highContrast
                  ? 'bg-red-500 text-white border-2 border-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
              }`}
              title="Hentikan bacaan suara sekarang"
            >
              <VolumeX className="w-5 h-5 text-red-600" />
              <span>Hentikan Suara</span>
            </button>
          )}

          {/* Suis Mod Kontras Tinggi */}
          <button
            id="toggle-contrast-button"
            onClick={() => {
              setHighContrast(!highContrast);
              seniorAudio.announcePrompt(
                !highContrast ? 'Mod kontras tinggi diaktifkan' : 'Mod paparan biasa diaktifkan'
              );
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors border ${
              highContrast
                ? 'bg-yellow-400 text-black border-yellow-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
            }`}
            aria-label="Tukar Mod Paparan Kontras"
          >
            <Eye className="w-4 h-4" />
            <span>{highContrast ? 'Mod Biasa' : 'Kontras Tinggi'}</span>
          </button>

          {/* Pemilih Saiz Tulisan */}
          <div
            id="text-size-controls"
            className={`flex items-center gap-1 p-1 rounded-xl border ${
              highContrast
                ? 'bg-slate-900 border-yellow-400'
                : 'bg-slate-100 border-slate-300'
            }`}
          >
            <span
              className={`text-xs font-semibold px-2 flex items-center gap-1 ${
                highContrast ? 'text-yellow-300' : 'text-slate-500'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Tulisan:
            </span>
            {(['normal', 'large', 'extralarge'] as TextSize[]).map((size) => (
              <button
                key={size}
                id={`font-size-${size}-btn`}
                onClick={() => {
                  setTextSize(size);
                  seniorAudio.announcePrompt(
                    size === 'extralarge'
                      ? 'Tulisan sangat besar'
                      : size === 'large'
                      ? 'Tulisan besar'
                      : 'Tulisan biasa'
                  );
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  textSize === size
                    ? highContrast
                      ? 'bg-yellow-400 text-black'
                      : 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : highContrast
                    ? 'text-gray-300 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {size === 'normal' ? 'Biasa' : size === 'large' ? 'Besar' : 'Ekstra'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
