import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraScanner } from './components/CameraScanner';
import { MedicationAudioView } from './components/MedicationAudioView';
import { RecentMedications } from './components/RecentMedications';
import { ProcessedMedication, TextSize, MedicationData } from './types';
import { seniorAudio } from './utils/audioPlayer';
import { AlertCircle, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'medication_audio_history_v1';
const TEXT_SIZE_KEY = 'medication_text_size_v1';
const CONTRAST_KEY = 'medication_contrast_v1';

export default function App() {
  const [currentMedication, setCurrentMedication] = useState<ProcessedMedication | null>(null);
  const [history, setHistory] = useState<ProcessedMedication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Keutamaan kebolehcapaian (Accessibility)
  const [textSize, setTextSize] = useState<TextSize>('large'); // saiz lalai besar untuk warga emas
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Muatkan tetapan tersimpan dan sejarah
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      const savedTextSize = localStorage.getItem(TEXT_SIZE_KEY) as TextSize | null;
      if (savedTextSize) {
        setTextSize(savedTextSize);
      }

      const savedContrast = localStorage.getItem(CONTRAST_KEY);
      if (savedContrast !== null) {
        setHighContrast(savedContrast === 'true');
      }
    } catch (err) {
      console.warn('Ralat membaca storan tempatan:', err);
    }

    seniorAudio.setOnStateChange((speaking) => {
      setIsSpeaking(speaking);
    });

    return () => {
      seniorAudio.stop();
    };
  }, []);

  // Simpan tetapan pilihan
  const handleSetTextSize = (size: TextSize) => {
    setTextSize(size);
    localStorage.setItem(TEXT_SIZE_KEY, size);
  };

  const handleSetHighContrast = (val: boolean) => {
    setHighContrast(val);
    localStorage.setItem(CONTRAST_KEY, String(val));
  };

  const saveToHistory = (newMed: ProcessedMedication) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.data.medicationName !== newMed.data.medicationName);
      const updated = [newMed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Gagal menyimpan sejarah:', e);
      }
      return updated;
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    seniorAudio.announcePrompt('Sejarah imbasan dipadam');
  };

  const [lastAttemptedImage, setLastAttemptedImage] = useState<{
    base64: string;
    source: 'camera' | 'upload' | 'sample';
    sampleId?: string;
  } | null>(null);

  // Proses gambar label dengan Gemini AI
  const handleImageSelected = async (
    base64Image: string,
    source: 'camera' | 'upload' | 'sample',
    sampleId?: string
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLastAttemptedImage({ base64: base64Image, source, sampleId });

    try {
      let mimeType = 'image/jpeg';
      if (base64Image.startsWith('data:image/png')) {
        mimeType = 'image/png';
      } else if (base64Image.startsWith('data:image/svg+xml')) {
        mimeType = 'image/svg+xml';
      }

      const response = await fetch('/api/analyze-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, mimeType, sampleId }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        const rawErr = json.error || '';
        if (response.status === 503 || rawErr.includes('503') || rawErr.includes('high demand') || rawErr.includes('UNAVAILABLE')) {
          throw new Error('Perkhidmatan bacaan AI sedang mengalami permintaan tinggi seketika. Sila tekan "Cuba Semula".');
        }
        throw new Error(
          rawErr || 'Tidak dapat membaca teks pada label dengan jelas. Sila cuba lagi dengan pencahayaan yang lebih terang.'
        );
      }

      const medData: MedicationData = json.data;
      const newMed: ProcessedMedication = {
        id: `med_${Date.now()}`,
        timestamp: Date.now(),
        imageUri: base64Image,
        data: medData,
        source,
      };

      setCurrentMedication(newMed);
      saveToHistory(newMed);
      setLastAttemptedImage(null);
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      let friendlyMsg = 'Kami tidak dapat membaca label ubat dengan jelas. Sila pastikan pencahayaan cukup terang.';
      if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('permintaan tinggi') || errMsg.includes('sibuk')) {
        friendlyMsg = 'Perkhidmatan pembaca AI sedang sibuk seketika. Sila tekan butang "Cuba Semula" di bawah.';
      } else if (err.message) {
        friendlyMsg = err.message;
      }
      setErrorMessage(friendlyMsg);
      seniorAudio.announcePrompt('Sila tekan Cuba Semula sebentar lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastAttemptedImage) {
      handleImageSelected(
        lastAttemptedImage.base64,
        lastAttemptedImage.source,
        lastAttemptedImage.sampleId
      );
    }
  };

  const handleStopAudio = () => {
    seniorAudio.stop();
    setIsSpeaking(false);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${
        highContrast ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Pengepala dengan Bar Alat Aksesibiliti Mesra Warga Emas */}
      <Header
        textSize={textSize}
        setTextSize={handleSetTextSize}
        highContrast={highContrast}
        setHighContrast={handleSetHighContrast}
        isSpeaking={isSpeaking}
        onStopAudio={handleStopAudio}
      />

      {/* Ruang Kandungan Utama */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Kotak Pemberitahuan Ralat */}
        {errorMessage && (
          <div
            id="error-banner"
            className={`mb-6 p-4 rounded-2xl border-2 flex items-start gap-3 shadow-md ${
              highContrast
                ? 'bg-red-950 border-red-500 text-white'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-base">Pemberitahuan Bacaan Label</h4>
              <p className="text-sm mt-1">{errorMessage}</p>
              <div className="mt-3 flex items-center gap-3">
                {lastAttemptedImage && (
                  <button
                    onClick={handleRetry}
                    className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cuba Semula Sekarang</span>
                  </button>
                )}
                <button
                  onClick={() => setErrorMessage(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paparan Semasa: Butiran Ubat & Audio ATAU Kamera Pengimbas */}
        {currentMedication ? (
          <MedicationAudioView
            medication={currentMedication}
            onScanAnother={() => setCurrentMedication(null)}
            textSize={textSize}
            highContrast={highContrast}
          />
        ) : (
          <div className="space-y-8">
            <CameraScanner
              onImageSelected={handleImageSelected}
              isLoading={isLoading}
              textSize={textSize}
              highContrast={highContrast}
            />

            {/* Senarai Ubat Yang Disimpan untuk Dengar Semula */}
            <RecentMedications
              medications={history}
              onSelect={(med) => setCurrentMedication(med)}
              onDelete={handleDeleteHistoryItem}
              onClearAll={handleClearAllHistory}
              textSize={textSize}
              highContrast={highContrast}
            />
          </div>
        )}
      </main>

      {/* Kaki Halaman Mesra Warga Emas */}
      <footer
        id="app-footer"
        className={`py-8 px-4 border-t text-center text-xs sm:text-sm transition-colors ${
          highContrast
            ? 'bg-slate-950 border-yellow-400 text-gray-300'
            : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap text-sm font-semibold">
            <span className={highContrast ? 'text-yellow-300' : 'text-slate-900'}>Easy Label</span>
            <span>&bull;</span>
            <span>Established 2026 by <strong>Inovasi Farmasi PKD Tanah Merah</strong></span>
          </div>
          <p className={`text-xs ${highContrast ? 'text-gray-400' : 'text-slate-500'}`}>
            <strong>Peringatan Perubatan:</strong> Pembantu audio ini membantu membacakan label ubat bercetak secara suara untuk kemudahan pesakit.
            Sentiasa sahkan arahan ubat anda dengan doktor atau ahli farmasi sebelum mengambil sebarang ubat.
          </p>
        </div>
      </footer>
    </div>
  );
}
